--[[
	Escenarios de las recompensas por invitar. Corre después de harness.luau
	(ver run.js).
]]

local PRODUCTS = { "Tirada del destino", "Puñado de Legado", "11 Tiradas del destino", "Cofre de Legado" }

local failures = 0
local function check(ok, message)
	if not ok then
		failures += 1
		print("  FALLA: " .. message)
	end
end

local function test(name, fn)
	print("· " .. name)
	local before = #threadErrors
	fn()
	for i = before + 1, #threadErrors do
		failures += 1
		print("  ERROR: " .. threadErrors[i])
	end
end

local function times(log, entry)
	local n = 0
	for _, e in ipairs(log) do
		if e == entry then
			n += 1
		end
	end
	return n
end

local function hasWarning(world, text)
	for _, w in ipairs(world.warnings) do
		if string.find(w, text, 1, true) then
			return true
		end
	end
	return false
end

-- Un servidor con los scripts de verdad. Las entregas quedan en log como "userId:producto".
local function newServer(store, bus, log, wired)
	local world = newWorld(store, bus)
	local s = world.services
	world.addModule(s.ReplicatedStorage, "InviteRewards", SHARED)
	world.addModule(s.ServerScriptService, "InviteRewardsGrant", GRANT)
	world.Grant = world.require(GRANT)
	function world.wire()
		for _, product in ipairs(PRODUCTS) do
			world.Grant.items[product] = function(player)
				table.insert(log, `{player.UserId}:{product}`)
			end
		end
	end
	if wired ~= false then
		world.wire()
	end
	world.runScript(SERVER)
	run(0.5)
	return world
end

local function attr(player, name)
	return player:GetAttribute(name)
end

test("Primera invitación: el amigo entra y quien invitó recibe su recompensa", function()
	local store, bus, log = newStore(), newBus(), {}
	local server = newServer(store, bus, log)
	local inviter = server.addPlayer(1)
	run(1)
	check(attr(inviter, "InviteRewardsLoaded") == true, "el progreso no cargó")
	check(attr(inviter, "InviteCount") == 0, "debería empezar en 0")
	check(attr(inviter, "InviteReward_first") == false, "la primera recompensa no debería estar entregada")

	local friend = server.addPlayer(2, { ReferredByPlayerId = 1 })
	run(15)
	check(attr(inviter, "InviteCount") == 1, `cuenta {attr(inviter, "InviteCount")}, se esperaba 1`)
	check(attr(inviter, "InviteReward_first") == true, "no se marcó la primera recompensa")
	check(attr(inviter, "InviteReward_ten") == false, "la de 10 no debería estar")
	check(times(log, "1:Tirada del destino") == 1 and times(log, "1:Puñado de Legado") == 1, "no se entregó la primera recompensa una vez: " .. table.concat(log, ", "))
	check(#server.firedToClient == 1 and server.firedToClient[1].player == inviter and server.firedToClient[1].args[1] == "first", "no se avisó a la interfaz")
	check(attr(friend, "InviteCount") == 0, "al amigo no le cuenta nada")

	-- El mismo amigo vuelve a entrar con la invitación: no cuenta de nuevo.
	server.removePlayer(friend)
	server.addPlayer(2, { ReferredByPlayerId = 1 })
	run(15)
	check(attr(inviter, "InviteCount") == 1, "el mismo amigo contó dos veces")
	check(times(log, "1:Tirada del destino") == 1, "se entregó dos veces")

	-- Nadie se cuenta a sí mismo.
	server.addPlayer(3, { ReferredByPlayerId = 3 })
	run(15)
	check(store.data["inviter_3"] == nil, "alguien se contó a sí mismo")
end)

test("Diez amigos: la segunda recompensa, una sola vez", function()
	local store, bus, log = newStore(), newBus(), {}
	local server = newServer(store, bus, log)
	local inviter = server.addPlayer(100)
	run(1)
	-- Entran todos a la vez, para que las entregas se pisen.
	for i = 1, 10 do
		server.addPlayer(100 + i, { ReferredByPlayerId = 100 })
	end
	run(60)
	check(attr(inviter, "InviteCount") == 10, `cuenta {attr(inviter, "InviteCount")}, se esperaba 10`)
	check(attr(inviter, "InviteReward_ten") == true, "no se marcó la recompensa de 10")
	check(times(log, "100:Tirada del destino") == 1, "la primera se entregó " .. times(log, "100:Tirada del destino") .. " veces")
	check(times(log, "100:11 Tiradas del destino") == 1 and times(log, "100:Cofre de Legado") == 1, "la de 10 no se entregó una vez: " .. table.concat(log, ", "))

	-- Más amigos siguen sumando pero no hay más recompensas.
	server.addPlayer(111, { ReferredByPlayerId = 100 })
	run(15)
	check(attr(inviter, "InviteCount") == 11, "el amigo 11 no sumó")
	check(#log == 4, "se entregó algo de más: " .. table.concat(log, ", "))
end)

test("Si quien invitó no está, la recompensa lo espera", function()
	local store, bus, log = newStore(), newBus(), {}
	local server = newServer(store, bus, log)
	server.addPlayer(201, { ReferredByPlayerId = 200 })
	run(15)
	check(store.data["inviter_200"] and store.data["inviter_200"].count == 1, "no se guardó la invitación")
	check(#log == 0, "se entregó a alguien que no está")

	local other = newServer(store, bus, log)
	local inviter = other.addPlayer(200)
	run(5)
	check(attr(inviter, "InviteReward_first") == true, "al entrar no recibió la recompensa")
	check(times(log, "200:Tirada del destino") == 1, "no se entregó una vez: " .. table.concat(log, ", "))
	check(#other.firedToClient == 1, "no se avisó a la interfaz al entrar")
end)

test("Quien invitó está en otro servidor: le llega ahí", function()
	local store, bus, log = newStore(), newBus(), {}
	local serverA = newServer(store, bus, log)
	local serverB = newServer(store, bus, log)
	local inviter = serverB.addPlayer(300)
	run(1)
	serverA.addPlayer(301, { ReferredByPlayerId = 300 })
	run(20)
	check(attr(inviter, "InviteCount") == 1, "el otro servidor no se enteró")
	check(attr(inviter, "InviteReward_first") == true, "no recibió la recompensa en su servidor")
	check(times(log, "300:Tirada del destino") == 1, "no se entregó una vez: " .. table.concat(log, ", "))
end)

test("Si Roblox no dice quién invitó, lo dice la invitación (LaunchData), aunque tarde", function()
	local store, bus, log = newStore(), newBus(), {}
	local server = newServer(store, bus, log)
	local inviter = server.addPlayer(400)
	run(1)
	server.addPlayer(401, { ReferredByPlayerId = 0, LaunchData = '{"invitedBy":400}' })
	run(15)
	check(attr(inviter, "InviteCount") == 1, "no contó por LaunchData")

	local late = { ReferredByPlayerId = 0, LaunchData = "" }
	server.addPlayer(402, late)
	task.delay(5, function()
		late.LaunchData = '{"invitedBy":400}'
	end)
	run(20)
	check(attr(inviter, "InviteCount") == 2, "no contó la invitación que llegó tarde")

	server.addPlayer(403, { LaunchData = "basura" })
	run(20)
	check(attr(inviter, "InviteCount") == 2, "un LaunchData roto contó")
end)

test("Sin cómo entregar, la recompensa queda guardada y llega después", function()
	local store, bus, log = newStore(), newBus(), {}
	local server = newServer(store, bus, log, false)
	local inviter = server.addPlayer(500)
	run(1)
	server.addPlayer(501, { ReferredByPlayerId = 500 })
	run(15)
	check(attr(inviter, "InviteCount") == 1, "no contó")
	check(attr(inviter, "InviteReward_first") == false, "se marcó sin entregarse")
	check(hasWarning(server, "falta cómo entregar"), "no avisó qué falta")
	check(not store.data["inviter_500"].granted.first, "quedó reservada sin entregarse")

	server.wire()
	server.removePlayer(inviter)
	inviter = server.addPlayer(500)
	run(5)
	check(attr(inviter, "InviteReward_first") == true, "no llegó después")
	check(times(log, "500:Tirada del destino") == 1, "no se entregó una vez")
end)

test("Si el juego todavía carga la partida, espera para entregar", function()
	local store, bus, log = newStore(), newBus(), {}
	local server = newServer(store, bus, log)
	local loaded = {}
	server.Grant.ready = function(player)
		return loaded[player.UserId] == true
	end
	server.addPlayer(601, { ReferredByPlayerId = 600 })
	run(15)
	local inviter = server.addPlayer(600)
	run(5)
	check(attr(inviter, "InviteCount") == 1, "no mostró el progreso mientras carga")
	check(#log == 0, "entregó antes de que cargara la partida")
	loaded[600] = true
	run(5)
	check(attr(inviter, "InviteReward_first") == true, "no entregó cuando terminó de cargar")
	check(times(log, "600:Tirada del destino") == 1, "no se entregó una vez")
end)

test("DataStore que falla un rato o escribe dos veces: igual cuenta una vez", function()
	local store, bus, log = newStore(), newBus(), {}
	local server = newServer(store, bus, log)
	local inviter = server.addPlayer(700)
	run(1)
	store.fail = 2
	store.conflict = true
	server.addPlayer(701, { ReferredByPlayerId = 700 })
	run(40)
	check(attr(inviter, "InviteCount") == 1, `cuenta {attr(inviter, "InviteCount")}, se esperaba 1`)
	check(times(log, "700:Tirada del destino") == 1, "no se entregó una vez: " .. table.concat(log, ", "))
end)

test("Interfaz: progreso, recompensas y ventana de invitaciones", function()
	local world = newWorld(newStore(), newBus())
	local s = world.services
	world.addModule(s.ReplicatedStorage, "InviteRewards", SHARED)
	local remote = world.new("RemoteEvent")
	remote.Name = "InviteRewardGranted"
	remote.Parent = s.ReplicatedStorage
	local player = world.new("Player")
	player.UserId = 900
	player.Name = "Jugador900"
	world.new("PlayerGui").Parent = player
	player.Parent = s.Players
	s.Players.LocalPlayer = player

	world.runScript(CLIENT)
	run(1)
	local gui = find(player.PlayerGui, "InviteRewardsGui")
	check(gui ~= nil, "no se creó la interfaz")
	if not gui then
		return
	end
	local overlay = find(gui, "Overlay")
	local progress = find(gui, "Progress")
	local first = find(gui, "Reward_first")
	local ten = find(gui, "Reward_ten")
	check(find(gui, "OpenButton").Visible == true, "no se ve el botón")
	check(progress.Text == "Cargando tu progreso…", "debería decir que carga")
	check(find(first, "Items").Text == "Tirada del destino + Puñado de Legado", "la primera recompensa dice " .. find(first, "Items").Text)
	check(find(ten, "Items").Text == "11 Tiradas del destino + Cofre de Legado", "la de 10 dice " .. find(ten, "Items").Text)

	player:SetAttribute("InviteCount", 3)
	player:SetAttribute("InviteReward_first", false)
	player:SetAttribute("InviteRewardsLoaded", true)
	run(0.1)
	check(progress.Text == "Amigos que entraron con tu invitación: 3 / 10", "progreso: " .. progress.Text)
	check(find(gui, "Fill").Size.X.Scale == 0.3, "la barra no va por 3/10")
	check(find(first, "Status").Text == "Invitar ›", "la primera debería invitar")

	find(gui, "OpenButton").Activated:Fire()
	run(0.1)
	check(overlay.Visible == true, "no se abrió el panel")

	first.Activated:Fire()
	run(1)
	check(#world.prompts == 1, "tocar la recompensa no abrió la ventana de invitaciones")
	local options = world.prompts[1] and world.prompts[1].options
	check(options and options.PromptMessage == "¡Invitá a tus amigos a BitBeyonder!", "falta el mensaje de la invitación")
	check(options and options.LaunchData == '{"invitedBy":900}', "la invitación no lleva quién invita")

	player:SetAttribute("InviteReward_first", true)
	run(0.1)
	check(find(first, "Status").Text == "✓ Conseguida", "no se marcó conseguida")
	first.Activated:Fire()
	run(1)
	check(#world.prompts == 1, "una recompensa conseguida no debería abrir invitaciones")
	ten.Activated:Fire()
	run(1)
	check(#world.prompts == 2, "la de 10 no abrió invitaciones")

	world.canSend = false
	find(gui, "InviteButton").Activated:Fire()
	run(1)
	check(#world.prompts == 2, "abrió invitaciones sin poder invitar")
	check(find(gui, "Notice").Visible == true, "no avisó que no se puede invitar")

	remote.OnClientEvent:Fire("ten")
	run(0.1)
	local toast = find(gui, "Toast")
	check(toast.Visible == true, "no apareció el aviso de recompensa")
	check(find(toast, "Items").Text == "11 Tiradas del destino + Cofre de Legado", "el aviso dice " .. find(toast, "Items").Text)
	run(7)
	check(toast.Visible == false, "el aviso no se fue")

	overlay.Activated:Fire()
	run(0.1)
	check(overlay.Visible == false, "tocar afuera no cerró el panel")
	world.require(SHARED).openPanel()
	run(0.1)
	check(overlay.Visible == true, "openPanel() no abrió el panel")
	check(find(gui, "Notice").Visible == false, "el aviso viejo quedó a la vista")
end)

if failures > 0 then
	print(`\n{failures} problema(s)`)
	error("fallaron pruebas", 0)
end
print("\nTodo bien.")
