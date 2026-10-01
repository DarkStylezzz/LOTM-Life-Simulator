--[[
	Pruebas de las recompensas por invitar, con un Roblox simulado: reloj
	virtual, DataStore y MessagingService en memoria, jugadores, atributos e
	instancias de interfaz. No hace falta Roblox Studio.

	No se corre solo: node roblox/invite-rewards/tests/run.js le pone delante
	el código de los scripts (SOURCES), le agrega tests.luau y lo ejecuta con
	el intérprete luau.
]]

------------------------------------------------------------------ reloj
local now = 0
local seq = 0
local queue = {}
local threadErrors = {}

local function resume(co, ...)
	local ok, err = coroutine.resume(co, ...)
	if not ok then
		table.insert(threadErrors, tostring(err))
	end
end

local function schedule(at, co, ...)
	seq += 1
	table.insert(queue, { at = at, seq = seq, co = co, args = table.pack(...) })
end

local task = {}
function task.spawn(f, ...)
	local co = if type(f) == "thread" then f else coroutine.create(f)
	resume(co, ...)
	return co
end
function task.wait(t)
	local start = now
	schedule(now + (t or 0.03), coroutine.running())
	coroutine.yield()
	return now - start
end
function task.delay(t, f, ...)
	local co = coroutine.create(f)
	schedule(now + t, co, ...)
	return co
end

local function run(seconds)
	local stop = now + seconds
	while true do
		table.sort(queue, function(a, b)
			return if a.at == b.at then a.seq < b.seq else a.at < b.at
		end)
		local item = queue[1]
		if not item or item.at > stop then
			break
		end
		table.remove(queue, 1)
		now = item.at
		resume(item.co, table.unpack(item.args, 1, item.args.n))
	end
	now = stop
end

------------------------------------------------------------------ señales
local function newSignal()
	local handlers = {}
	local signal = {}
	function signal:Connect(fn)
		table.insert(handlers, fn)
		return {
			Disconnect = function()
				table.remove(handlers, table.find(handlers, fn))
			end,
		}
	end
	function signal:Fire(...)
		for _, fn in ipairs(table.clone(handlers)) do
			task.spawn(fn, ...)
		end
	end
	return signal
end

------------------------------------------------------------------ tipos de datos
local Enum = setmetatable({}, {
	__index = function(_, enumName)
		return setmetatable({}, {
			__index = function(_, item)
				return `Enum.{enumName}.{item}`
			end,
		})
	end,
})
local UDim = { new = function(s, o) return { Scale = s, Offset = o } end }
local UDim2 = {
	new = function(xs, xo, ys, yo) return { X = UDim.new(xs, xo), Y = UDim.new(ys, yo) } end,
	fromScale = function(x, y) return { X = UDim.new(x, 0), Y = UDim.new(y, 0) } end,
	fromOffset = function(x, y) return { X = UDim.new(0, x), Y = UDim.new(0, y) } end,
}
local Vector2 = { new = function(x, y) return { X = x, Y = y } end }
local Color3 = {
	new = function(r, g, b) return { R = r, G = g, B = b } end,
	fromRGB = function(r, g, b) return { R = r / 255, G = g / 255, B = b / 255 } end,
}

------------------------------------------------------------------ instancias
local EVENTS = { Activated = true, Event = true, OnClientEvent = true, PlayerAdded = true, PlayerRemoving = true }

local Methods = {}
local InstanceMeta = {}

local function newInstance(world, className)
	local obj = setmetatable({
		_world = world,
		_props = { ClassName = className, Name = className },
		_children = {},
		_signals = {},
		_attrs = {},
		_attrSignals = {},
	}, InstanceMeta)
	if className == "BindableEvent" then
		obj._props.Event = newSignal()
	end
	return obj
end

InstanceMeta.__index = function(self, key)
	if Methods[key] then
		return Methods[key]
	end
	local value = rawget(self, "_props")[key]
	if value ~= nil then
		return value
	end
	if EVENTS[key] then
		local signals = rawget(self, "_signals")
		signals[key] = signals[key] or newSignal()
		return signals[key]
	end
	for _, child in ipairs(rawget(self, "_children")) do
		if child.Name == key then
			return child
		end
	end
	return nil
end

InstanceMeta.__newindex = function(self, key, value)
	local props = rawget(self, "_props")
	if key == "Parent" then
		local old = props.Parent
		if old then
			local siblings = rawget(old, "_children")
			table.remove(siblings, table.find(siblings, self))
		end
		props.Parent = value
		if value then
			table.insert(rawget(value, "_children"), self)
		end
		return
	end
	props[key] = value
end

function Methods:FindFirstChild(name)
	for _, child in ipairs(rawget(self, "_children")) do
		if child.Name == name then
			return child
		end
	end
	return nil
end
function Methods:WaitForChild(name)
	for _ = 1, 100 do
		local child = self:FindFirstChild(name)
		if child then
			return child
		end
		task.wait(0.1)
	end
	error(`espera infinita de {name} en {self.Name}`)
end
function Methods:GetChildren()
	return table.clone(rawget(self, "_children"))
end
function Methods:SetAttribute(name, value)
	local attrs = rawget(self, "_attrs")
	if attrs[name] == value then
		return
	end
	attrs[name] = value
	local signal = rawget(self, "_attrSignals")[name]
	if signal then
		signal:Fire()
	end
end
function Methods:GetAttribute(name)
	return rawget(self, "_attrs")[name]
end
function Methods:GetAttributeChangedSignal(name)
	local signals = rawget(self, "_attrSignals")
	signals[name] = signals[name] or newSignal()
	return signals[name]
end
function Methods:Fire(...)
	self.Event:Fire(...)
end
function Methods:FireClient(player, ...)
	table.insert(rawget(self, "_world").firedToClient, { player = player, args = { ... } })
end
function Methods:GetJoinData()
	return rawget(self, "_joinData")
end
function Methods:GetPlayers()
	local players = {}
	for _, child in ipairs(rawget(self, "_children")) do
		if child.ClassName == "Player" then
			table.insert(players, child)
		end
	end
	return players
end
function Methods:GetPlayerByUserId(userId)
	for _, player in ipairs(self:GetPlayers()) do
		if player.UserId == userId then
			return player
		end
	end
	return nil
end

-- Busca una instancia por su nombre dentro de otra (en cualquier nivel).
local function find(root, name)
	for _, child in ipairs(rawget(root, "_children")) do
		if child.Name == name then
			return child
		end
		local found = find(child, name)
		if found then
			return found
		end
	end
	return nil
end

------------------------------------------------------------------ servicios compartidos
local function deepCopy(value)
	if type(value) ~= "table" then
		return value
	end
	local copy = {}
	for k, v in pairs(value) do
		copy[k] = deepCopy(v)
	end
	return copy
end

-- Un DataStore en memoria. fail = cuántas llamadas fallan antes de andar;
-- conflict = el transform corre dos veces (como cuando otro servidor escribió en el medio).
local function newStore()
	local store = { data = {}, fail = 0, conflict = false, calls = 0 }
	function store:UpdateAsync(key, transform)
		self.calls += 1
		task.wait(0.05)
		if self.fail > 0 then
			self.fail -= 1
			error("DataStore no disponible (simulado)")
		end
		if self.conflict then
			transform(deepCopy(self.data[key]))
		end
		local result = transform(deepCopy(self.data[key]))
		if result ~= nil then
			self.data[key] = deepCopy(result)
		end
		task.wait(0.05)
		return result
	end
	return store
end

local function newBus()
	return { subs = {} }
end

local HttpService = {}
function HttpService:JSONEncode(value)
	return `\{"invitedBy":{value.invitedBy}\}`
end
function HttpService:JSONDecode(text)
	local id = string.match(text, '"invitedBy"%s*:%s*(%d+)')
	if not id then
		error("JSON inválido")
	end
	return { invitedBy = tonumber(id) }
end

------------------------------------------------------------------ mundos (un servidor o un cliente)
local nextWorld = 0
local function newWorld(store, bus)
	nextWorld += 1
	local world = {
		id = nextWorld,
		warnings = {},
		firedToClient = {},
		prompts = {},
		canSend = true,
		modules = {},
	}
	local function new(className)
		return newInstance(world, className)
	end
	world.new = new

	local services = {
		ReplicatedStorage = new("ReplicatedStorage"),
		ServerScriptService = new("ServerScriptService"),
		Players = new("Players"),
		HttpService = HttpService,
		DataStoreService = {
			GetDataStore = function()
				return store
			end,
		},
		MessagingService = {
			SubscribeAsync = function(_, topic, callback)
				table.insert(bus.subs, { topic = topic, callback = callback })
				return {}
			end,
			PublishAsync = function(_, topic, data)
				task.wait(0.1)
				for _, sub in ipairs(bus.subs) do
					if sub.topic == topic then
						task.spawn(sub.callback, { Data = data, Sent = now })
					end
				end
			end,
		},
		SocialService = {
			CanSendGameInviteAsync = function()
				task.wait(0.05)
				return world.canSend
			end,
			PromptGameInvite = function(_, player, options)
				table.insert(world.prompts, { player = player, options = options })
			end,
		},
	}
	world.services = services
	world.game = {
		GetService = function(_, name)
			return services[name] or error(`servicio desconocido: {name}`)
		end,
	}

	local env
	local function load(path)
		local chunk, err = loadstring(SOURCES[path], "=" .. path)
		assert(chunk, err)
		setfenv(chunk, env)
		return chunk
	end
	env = setmetatable({
		game = world.game,
		task = task,
		Instance = { new = new },
		Enum = Enum,
		UDim = UDim,
		UDim2 = UDim2,
		Vector2 = Vector2,
		Color3 = Color3,
		warn = function(...)
			local parts = {}
			for i = 1, select("#", ...) do
				table.insert(parts, tostring((select(i, ...))))
			end
			table.insert(world.warnings, table.concat(parts, " "))
		end,
	}, { __index = getfenv(1) })
	function env.require(module)
		return world.require(module._sourcePath)
	end
	function world.require(path)
		if world.modules[path] == nil then
			world.modules[path] = load(path)()
		end
		return world.modules[path]
	end

	function world.addModule(parent, name, path)
		local module = new("ModuleScript")
		module.Name = name
		rawset(module, "_sourcePath", path)
		module.Parent = parent
		return module
	end
	function world.runScript(path)
		task.spawn(load(path))
	end
	function world.addPlayer(userId, joinData)
		local player = new("Player")
		player.Name = `Jugador{userId}`
		player.UserId = userId
		rawset(player, "_joinData", joinData or {})
		new("PlayerGui").Parent = player
		player.Parent = services.Players
		services.Players.PlayerAdded:Fire(player)
		return player
	end
	function world.removePlayer(player)
		player.Parent = nil
		services.Players.PlayerRemoving:Fire(player)
	end
	return world
end

------------------------------------------------------------------ rutas
local SHARED = "ReplicatedStorage/InviteRewards.luau"
local GRANT = "ServerScriptService/InviteRewardsGrant.luau"
local SERVER = "ServerScriptService/InviteRewardsServer.server.luau"
local CLIENT = "StarterPlayerScripts/InviteRewardsClient.client.luau"
