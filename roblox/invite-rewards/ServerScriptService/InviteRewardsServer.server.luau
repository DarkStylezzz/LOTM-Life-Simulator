--[[
	InviteRewardsServer (Script en ServerScriptService)

	Cuenta los amigos que entran al juego con tu invitación y entrega las
	recompensas de ReplicatedStorage > InviteRewards al llegar a cada meta.

	Roblox no le dice al juego a quién invitaste (GameInvitePromptClosed llega
	siempre vacío), así que la invitación cuenta cuando el amigo entra: Roblox
	informa quién lo invitó en GetJoinData().ReferredByPlayerId, y la invitación
	además lleva ese id en LaunchData. Cada amigo cuenta una sola vez para cada
	persona que lo invita, y nadie se cuenta a sí mismo.

	El progreso vive en un DataStore propio, así que también cuenta si estabas
	desconectado o en otro servidor cuando tu amigo entró: la recompensa llega
	en cuanto estés en el juego.
]]

local DataStoreService = game:GetService("DataStoreService")
local HttpService = game:GetService("HttpService")
local MessagingService = game:GetService("MessagingService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local InviteRewards = require(ReplicatedStorage:WaitForChild("InviteRewards"))
local Grant = require(ServerScriptService:WaitForChild("InviteRewardsGrant"))

local STORE_NAME = "InviteRewards_v1"
local TOPIC = "InviteRewards"
local ATTR = InviteRewards.Attributes
-- Amigos que se recuerdan por persona: de sobra para la meta más alta, y con
-- lugar por si algún día se agrega otra.
local MAX_FRIENDS = math.max(InviteRewards.goal(), 100)

-- Avisa a la interfaz cuándo llegó una recompensa, para mostrarlo.
local grantedEvent = Instance.new("RemoteEvent")
grantedEvent.Name = "InviteRewardGranted"
grantedEvent.Parent = ReplicatedStorage

local okStore, store = pcall(DataStoreService.GetDataStore, DataStoreService, STORE_NAME)
if not okStore then
	warn("InviteRewards: sin DataStore, no se cuentan invitaciones:", store)
	return
end

local function keyFor(userId: number): string
	return "inviter_" .. tostring(userId)
end

-- { count = número de amigos, friends = { [userId] = true }, granted = { [id de recompensa] = true } }
local function normalize(data)
	if type(data) ~= "table" then
		data = {}
	end
	if type(data.friends) ~= "table" then
		data.friends = {}
	end
	if type(data.granted) ~= "table" then
		data.granted = {}
	end
	data.count = tonumber(data.count) or 0
	return data
end

-- Los DataStore fallan de vez en cuando: se reintenta antes de rendirse.
local function withRetries(label: string, fn: () -> ()): boolean
	for attempt = 1, 4 do
		local ok, err = pcall(fn)
		if ok then
			return true
		end
		if attempt == 4 then
			warn(`InviteRewards: no se pudo {label}:`, err)
			break
		end
		task.wait(2 ^ attempt)
	end
	return false
end

-- Suma un amigo a quien lo invitó. true si contó (no lo tenía ya).
local function addFriend(inviterId: number, friendId: number): boolean
	local added = false
	local ok = withRetries("sumar una invitación", function()
		store:UpdateAsync(keyFor(inviterId), function(old)
			added = false
			local data = normalize(old)
			local friendKey = tostring(friendId)
			if data.friends[friendKey] or data.count >= MAX_FRIENDS then
				return nil
			end
			data.friends[friendKey] = true
			data.count += 1
			added = true
			return data
		end)
	end)
	return ok and added
end

-- Lee el progreso y, si se puede entregar, reserva las recompensas ganadas
-- que todavía no se entregaron. Reservarlas antes de entregarlas evita que
-- dos servidores las entreguen a la vez.
local function claimDue(userId: number, canClaim: boolean)
	local snapshot, claimed = nil, {}
	local ok = withRetries("leer las invitaciones", function()
		store:UpdateAsync(keyFor(userId), function(old)
			local data = normalize(old)
			snapshot, claimed = data, {}
			if not canClaim then
				return nil
			end
			for _, reward in ipairs(InviteRewards.Rewards) do
				if data.count >= reward.invites and not data.granted[reward.id] then
					data.granted[reward.id] = true
					table.insert(claimed, reward)
				end
			end
			if #claimed == 0 then
				return nil
			end
			return data
		end)
	end)
	if not ok then
		return nil, {}
	end
	return snapshot, claimed
end

-- Devuelve una recompensa reservada que no se pudo entregar.
local function release(userId: number, rewardId: string)
	withRetries("guardar una recompensa para después", function()
		store:UpdateAsync(keyFor(userId), function(old)
			local data = normalize(old)
			if not data.granted[rewardId] then
				return nil
			end
			data.granted[rewardId] = nil
			return data
		end)
	end)
end

local function isReady(player: Player): boolean
	local ok, ready = pcall(Grant.ready, player)
	return ok and ready == true
end

-- Entrega una recompensa. false si falta cómo entregar alguna de sus cosas:
-- entonces no se entrega nada y queda para cuando exista.
local function deliver(player: Player, reward): boolean
	for _, item in ipairs(reward.items) do
		if type(Grant.items[item]) ~= "function" then
			warn(`InviteRewards: falta cómo entregar "{item}" en InviteRewardsGrant; la recompensa "{reward.id}" queda guardada`)
			return false
		end
	end
	for _, item in ipairs(reward.items) do
		local ok, result = pcall(Grant.items[item], player)
		if not ok or result == false then
			-- No se reintenta, para no entregar dos veces lo que sí salió.
			warn(`InviteRewards: no se pudo entregar "{item}" a {player.Name}:`, result)
		end
	end
	return true
end

local busy: { [Player]: boolean } = {}
local again: { [Player]: boolean } = {}

-- Muestra el progreso del jugador y le entrega lo que ya ganó.
local function refresh(player: Player)
	if busy[player] then
		again[player] = true
		return
	end
	busy[player] = true
	repeat
		again[player] = nil
		local data, claimed = claimDue(player.UserId, isReady(player))
		if data and player.Parent then
			local pending = {}
			for _, reward in ipairs(claimed) do
				pending[reward.id] = true
			end
			player:SetAttribute(ATTR.Count, data.count)
			for _, reward in ipairs(InviteRewards.Rewards) do
				player:SetAttribute(ATTR.RewardPrefix .. reward.id, data.granted[reward.id] == true and not pending[reward.id])
			end
			player:SetAttribute(ATTR.Loaded, true)
			for _, reward in ipairs(claimed) do
				if deliver(player, reward) then
					player:SetAttribute(ATTR.RewardPrefix .. reward.id, true)
					grantedEvent:FireClient(player, reward.id)
				else
					release(player.UserId, reward.id)
				end
			end
		else
			-- Se fue antes de recibirlas: quedan para la próxima vez.
			for _, reward in ipairs(claimed) do
				release(player.UserId, reward.id)
			end
		end
	until not again[player] or not player.Parent
	busy[player] = nil
	again[player] = nil
end

-- Quién invitó a este jugador, o nil. Roblox puede tardar unos segundos en
-- tener los datos de la invitación, así que se pregunta varias veces.
local function inviterOf(player: Player): number?
	for _ = 1, 6 do
		local ok, joinData = pcall(player.GetJoinData, player)
		if ok and type(joinData) == "table" then
			local referredBy = tonumber(joinData.ReferredByPlayerId)
			if referredBy and referredBy > 0 then
				return referredBy
			end
			local launchData = joinData.LaunchData
			if type(launchData) == "string" and launchData ~= "" then
				local okJson, decoded = pcall(HttpService.JSONDecode, HttpService, launchData)
				local fromLaunch = okJson and type(decoded) == "table" and tonumber(decoded.invitedBy)
				if fromLaunch and fromLaunch > 0 then
					return fromLaunch
				end
			end
		end
		task.wait(2)
		if not player.Parent then
			return nil
		end
	end
	return nil
end

local function countInvite(friend: Player)
	local inviterId = inviterOf(friend)
	if not inviterId or inviterId == friend.UserId then
		return
	end
	if not addFriend(inviterId, friend.UserId) then
		return
	end
	local inviter = Players:GetPlayerByUserId(inviterId)
	if inviter then
		refresh(inviter)
	else
		-- Puede estar en otro servidor: que ese servidor le entregue la recompensa.
		pcall(MessagingService.PublishAsync, MessagingService, TOPIC, inviterId)
	end
end

local function onPlayerAdded(player: Player)
	task.spawn(countInvite, player)
	local readyNow = isReady(player)
	refresh(player)
	if readyNow then
		return
	end
	-- El juego todavía está cargando su partida: esperar para entregar.
	for _ = 1, 120 do
		if not player.Parent or isReady(player) then
			break
		end
		task.wait(1)
	end
	if player.Parent and isReady(player) then
		refresh(player)
	end
end

task.spawn(function()
	local ok, err = pcall(MessagingService.SubscribeAsync, MessagingService, TOPIC, function(message)
		local inviter = Players:GetPlayerByUserId(tonumber(message.Data) or 0)
		if inviter then
			task.spawn(refresh, inviter)
		end
	end)
	if not ok then
		warn("InviteRewards: sin avisos entre servidores:", err)
	end
end)

Players.PlayerAdded:Connect(onPlayerAdded)
for _, player in ipairs(Players:GetPlayers()) do
	task.spawn(onPlayerAdded, player)
end
