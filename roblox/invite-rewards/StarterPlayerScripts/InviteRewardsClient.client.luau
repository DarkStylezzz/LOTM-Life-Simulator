--[[
	InviteRewardsClient (LocalScript en StarterPlayer > StarterPlayerScripts)

	El botón "Invitá amigos" y su panel, con el progreso y las recompensas.
	Tocar una recompensa que todavía no tenés, o "Invitar amigos", abre la
	ventana de invitaciones de Roblox.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local InviteRewards = require(ReplicatedStorage:WaitForChild("InviteRewards"))
local grantedEvent = ReplicatedStorage:WaitForChild("InviteRewardGranted")

local ATTR = InviteRewards.Attributes
local GOAL = InviteRewards.goal()

-- Dónde va el botón: arriba a la derecha, debajo de la barra de Roblox.
local BUTTON_ANCHOR = Vector2.new(1, 0)
local BUTTON_POSITION = UDim2.new(1, -12, 0, 12)

local COLORS = {
	panel = Color3.fromRGB(16, 14, 22),
	row = Color3.fromRGB(30, 27, 38),
	rowDone = Color3.fromRGB(24, 34, 28),
	gold = Color3.fromRGB(214, 177, 102),
	text = Color3.fromRGB(236, 230, 216),
	muted = Color3.fromRGB(160, 152, 140),
	bar = Color3.fromRGB(46, 42, 56),
	done = Color3.fromRGB(122, 196, 132),
}

local player = Players.LocalPlayer

local function create(className: string, props, children)
	local instance = Instance.new(className)
	for key, value in pairs(props) do
		if key ~= "Parent" then
			instance[key] = value
		end
	end
	for _, child in ipairs(children or {}) do
		child.Parent = instance
	end
	if props.Parent then
		instance.Parent = props.Parent
	end
	return instance
end

local function corner(radius: number)
	return create("UICorner", { CornerRadius = UDim.new(0, radius) })
end

local function stroke(color: Color3)
	return create("UIStroke", { Color = color, Thickness = 1.5, ApplyStrokeMode = Enum.ApplyStrokeMode.Border })
end

local function padding(px: number)
	return create("UIPadding", {
		PaddingTop = UDim.new(0, px),
		PaddingBottom = UDim.new(0, px),
		PaddingLeft = UDim.new(0, px),
		PaddingRight = UDim.new(0, px),
	})
end

local function list(gap: number)
	return create("UIListLayout", { Padding = UDim.new(0, gap), SortOrder = Enum.SortOrder.LayoutOrder })
end

local function label(props)
	local defaults = {
		BackgroundTransparency = 1,
		Size = UDim2.new(1, 0, 0, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
		Font = Enum.Font.Gotham,
		TextSize = 14,
		TextColor3 = COLORS.text,
		TextWrapped = true,
		TextXAlignment = Enum.TextXAlignment.Left,
	}
	for key, value in pairs(props) do
		defaults[key] = value
	end
	return create("TextLabel", defaults)
end

local gui = create("ScreenGui", {
	Name = "InviteRewardsGui",
	ResetOnSpawn = false,
	ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
	DisplayOrder = 50,
})

local openButton = create("TextButton", {
	Name = "OpenButton",
	AnchorPoint = BUTTON_ANCHOR,
	Position = BUTTON_POSITION,
	Size = UDim2.fromOffset(0, 38),
	AutomaticSize = Enum.AutomaticSize.X,
	BackgroundColor3 = COLORS.panel,
	Font = Enum.Font.GothamBold,
	Text = "🎁 Invitá amigos",
	TextSize = 16,
	TextColor3 = COLORS.gold,
	Visible = InviteRewards.ShowButton,
	ZIndex = 5,
	Parent = gui,
}, {
	corner(10),
	stroke(COLORS.gold),
	create("UIPadding", { PaddingLeft = UDim.new(0, 14), PaddingRight = UDim.new(0, 14) }),
})

-- Fondo oscuro: tocar afuera del panel lo cierra.
local overlay = create("TextButton", {
	Name = "Overlay",
	Text = "",
	AutoButtonColor = false,
	BackgroundColor3 = Color3.new(0, 0, 0),
	BackgroundTransparency = 0.45,
	Size = UDim2.fromScale(1, 1),
	Visible = false,
	ZIndex = 10,
	Parent = gui,
})

local panel = create("Frame", {
	Name = "Panel",
	Active = true, -- que tocar el panel no lo cierre
	AnchorPoint = Vector2.new(0.5, 0.5),
	Position = UDim2.fromScale(0.5, 0.5),
	Size = UDim2.new(0.92, 0, 0, 0),
	AutomaticSize = Enum.AutomaticSize.Y,
	BackgroundColor3 = COLORS.panel,
	Parent = overlay,
}, {
	corner(14),
	stroke(COLORS.gold),
	padding(18),
	list(12),
	create("UISizeConstraint", { MaxSize = Vector2.new(400, math.huge) }),
})

local closeButton = create("TextButton", {
	Name = "Close",
	AnchorPoint = Vector2.new(1, 0),
	Position = UDim2.fromScale(1, 0),
	Size = UDim2.fromOffset(28, 28),
	BackgroundTransparency = 1,
	Font = Enum.Font.GothamBold,
	Text = "✕",
	TextSize = 18,
	TextColor3 = COLORS.muted,
})

create("Frame", {
	Name = "Header",
	LayoutOrder = 1,
	BackgroundTransparency = 1,
	Size = UDim2.new(1, 0, 0, 28),
	Parent = panel,
}, {
	label({
		Name = "Title",
		Size = UDim2.new(1, -36, 1, 0),
		AutomaticSize = Enum.AutomaticSize.None,
		Font = Enum.Font.Merriweather,
		Text = "Invitá a tus amigos",
		TextSize = 20,
		TextColor3 = COLORS.gold,
	}),
	closeButton,
})

label({
	Name = "Subtitle",
	LayoutOrder = 2,
	Text = "Cada amigo que entra al juego con tu invitación cuenta para tus recompensas.",
	TextColor3 = COLORS.muted,
	Parent = panel,
})

local progressText = label({
	Name = "Progress",
	LayoutOrder = 3,
	Font = Enum.Font.GothamMedium,
	Text = "Cargando tu progreso…",
	Parent = panel,
})

local fill = create("Frame", {
	Name = "Fill",
	Size = UDim2.fromScale(0, 1),
	BackgroundColor3 = COLORS.gold,
}, { corner(4) })

create("Frame", {
	Name = "Bar",
	LayoutOrder = 4,
	Size = UDim2.new(1, 0, 0, 8),
	BackgroundColor3 = COLORS.bar,
	Parent = panel,
}, { corner(4), fill })

local notice = label({
	Name = "Notice",
	LayoutOrder = 51,
	Text = "Desde esta cuenta no se pueden enviar invitaciones ahora.",
	TextColor3 = COLORS.muted,
	TextSize = 13,
	TextXAlignment = Enum.TextXAlignment.Center,
	Visible = false,
	Parent = panel,
})

local function invite()
	notice.Visible = not InviteRewards.promptInvite()
end

local rows = {}
for index, reward in ipairs(InviteRewards.Rewards) do
	local status = label({
		Name = "Status",
		AnchorPoint = Vector2.new(1, 0.5),
		Position = UDim2.fromScale(1, 0.5),
		Size = UDim2.fromOffset(100, 20),
		AutomaticSize = Enum.AutomaticSize.None,
		Font = Enum.Font.GothamBold,
		TextXAlignment = Enum.TextXAlignment.Right,
		TextWrapped = false,
	})
	local row = create("TextButton", {
		Name = "Reward_" .. reward.id,
		LayoutOrder = 10 + index,
		Text = "",
		Size = UDim2.new(1, 0, 0, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
		BackgroundColor3 = COLORS.row,
		Parent = panel,
	}, {
		corner(10),
		padding(12),
		create("Frame", {
			Name = "Texts",
			BackgroundTransparency = 1,
			Size = UDim2.new(1, -108, 0, 0),
			AutomaticSize = Enum.AutomaticSize.Y,
		}, {
			list(4),
			label({ Name = "Title", LayoutOrder = 1, Font = Enum.Font.GothamBold, Text = reward.title, TextSize = 16 }),
			label({ Name = "Items", LayoutOrder = 2, Text = table.concat(reward.items, " + "), TextColor3 = COLORS.muted }),
		}),
		status,
	})
	-- Una recompensa que falta lleva a la ventana de invitaciones.
	row.Activated:Connect(function()
		if player:GetAttribute(ATTR.RewardPrefix .. reward.id) ~= true then
			invite()
		end
	end)
	rows[reward.id] = { row = row, status = status }
end

local inviteButton = create("TextButton", {
	Name = "InviteButton",
	LayoutOrder = 50,
	Size = UDim2.new(1, 0, 0, 44),
	BackgroundColor3 = COLORS.gold,
	Font = Enum.Font.GothamBold,
	Text = "Invitar amigos",
	TextSize = 17,
	TextColor3 = COLORS.panel,
	Parent = panel,
}, { corner(10) })

local toast = create("TextButton", {
	Name = "Toast",
	AnchorPoint = Vector2.new(0.5, 0),
	Position = UDim2.new(0.5, 0, 0, 12),
	Size = UDim2.new(0.92, 0, 0, 0),
	AutomaticSize = Enum.AutomaticSize.Y,
	BackgroundColor3 = COLORS.panel,
	Text = "",
	Visible = false,
	ZIndex = 20,
	Parent = gui,
}, {
	corner(12),
	stroke(COLORS.gold),
	padding(12),
	list(2),
	create("UISizeConstraint", { MaxSize = Vector2.new(380, math.huge) }),
	label({ Name = "Title", LayoutOrder = 1, Font = Enum.Font.GothamBold, Text = "🎁 ¡Recompensa por invitar!", TextColor3 = COLORS.gold, TextSize = 16 }),
	label({ Name = "Items", LayoutOrder = 2 }),
})

local function update()
	local loaded = player:GetAttribute(ATTR.Loaded) == true
	local count = math.min(tonumber(player:GetAttribute(ATTR.Count)) or 0, GOAL)
	if loaded then
		progressText.Text = `Amigos que entraron con tu invitación: {count} / {GOAL}`
	else
		progressText.Text = "Cargando tu progreso…"
	end
	fill.Size = UDim2.fromScale(if GOAL > 0 then count / GOAL else 0, 1)
	for _, reward in ipairs(InviteRewards.Rewards) do
		local done = player:GetAttribute(ATTR.RewardPrefix .. reward.id) == true
		local view = rows[reward.id]
		view.row.BackgroundColor3 = if done then COLORS.rowDone else COLORS.row
		view.row.AutoButtonColor = not done
		view.status.Text = if done then "✓ Conseguida" else "Invitar ›"
		view.status.TextColor3 = if done then COLORS.done else COLORS.gold
	end
end

local function setOpen(open: boolean)
	overlay.Visible = open
	if open then
		notice.Visible = false
		update()
	end
end

local toastShown = 0
local function showToast(rewardId: string)
	for _, reward in ipairs(InviteRewards.Rewards) do
		if reward.id == rewardId then
			toast.Items.Text = table.concat(reward.items, " + ")
			toastShown += 1
			local shown = toastShown
			toast.Visible = true
			task.delay(6, function()
				if toastShown == shown then
					toast.Visible = false
				end
			end)
			return
		end
	end
end

openButton.Activated:Connect(function()
	setOpen(true)
end)
closeButton.Activated:Connect(function()
	setOpen(false)
end)
overlay.Activated:Connect(function()
	setOpen(false)
end)
inviteButton.Activated:Connect(invite)
toast.Activated:Connect(function()
	toast.Visible = false
	setOpen(true)
end)
InviteRewards.OpenRequested:Connect(function()
	setOpen(true)
end)
grantedEvent.OnClientEvent:Connect(showToast)

player:GetAttributeChangedSignal(ATTR.Loaded):Connect(update)
player:GetAttributeChangedSignal(ATTR.Count):Connect(update)
for _, reward in ipairs(InviteRewards.Rewards) do
	player:GetAttributeChangedSignal(ATTR.RewardPrefix .. reward.id):Connect(update)
end
update()

gui.Parent = player:WaitForChild("PlayerGui")
