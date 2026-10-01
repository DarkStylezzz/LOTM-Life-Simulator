--[[
	InviteRewards (ModuleScript en ReplicatedStorage)

	Qué se gana por invitar amigos y la función que abre la ventana de
	invitaciones de Roblox. Lo usan el servidor (para saber qué entregar) y la
	interfaz (para mostrarlo).

	Una invitación cuenta cuando el amigo entra al juego con ella: Roblox no le
	dice al juego a quién invitaste, sólo quién invitó a cada uno que entra.
]]

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local SocialService = game:GetService("SocialService")

local InviteRewards = {}

-- Texto que ve quien invita, arriba de su lista de amigos. Si es muy largo,
-- Roblox no lo muestra.
InviteRewards.PromptMessage = "¡Invitá a tus amigos a BitBeyonder!"

-- Mostrar el botón "Invitá amigos" en pantalla. Con false, el panel se abre
-- sólo desde tu propio menú, con InviteRewards.openPanel().
InviteRewards.ShowButton = true

-- De menor a mayor. "invites" cuenta amigos distintos que entraron con tu
-- invitación. "items" son productos de la tienda: se entrega lo mismo que da
-- cada uno (ver InviteRewardsGrant en ServerScriptService).
InviteRewards.Rewards = {
	{
		id = "first",
		invites = 1,
		title = "Tu primera invitación",
		items = { "Tirada del destino", "Puñado de Legado" },
	},
	{
		id = "ten",
		invites = 10,
		title = "10 invitaciones",
		items = { "11 Tiradas del destino", "Cofre de Legado" },
	},
}

-- Atributos del jugador que el servidor mantiene al día y la interfaz lee.
InviteRewards.Attributes = {
	Loaded = "InviteRewardsLoaded", -- true cuando ya se leyó el progreso
	Count = "InviteCount", -- amigos que entraron con tu invitación
	RewardPrefix = "InviteReward_", -- InviteReward_<id> = true si ya se entregó
}

function InviteRewards.goal(): number
	local goal = 0
	for _, reward in ipairs(InviteRewards.Rewards) do
		goal = math.max(goal, reward.invites)
	end
	return goal
end

-- Abre la ventana de invitaciones de Roblox. Sólo desde un LocalScript.
-- Devuelve false si esta cuenta no puede invitar ahora (en Studio, por la
-- configuración de privacidad o en una plataforma sin invitaciones).
function InviteRewards.promptInvite(): boolean
	local player = Players.LocalPlayer
	if not player then
		warn("InviteRewards.promptInvite sólo funciona desde un LocalScript")
		return false
	end

	local okCan, canSend = pcall(SocialService.CanSendGameInviteAsync, SocialService, player)
	if not okCan or not canSend then
		return false
	end

	local options = Instance.new("ExperienceInviteOptions")
	options.PromptMessage = InviteRewards.PromptMessage
	-- Quién invita viaja con la invitación, por si Roblox no lo informa por su lado.
	options.LaunchData = HttpService:JSONEncode({ invitedBy = player.UserId })

	local okPrompt, err = pcall(SocialService.PromptGameInvite, SocialService, player, options)
	if not okPrompt then
		warn("No se pudo abrir la ventana de invitaciones:", err)
	end
	return okPrompt
end

-- Para abrir el panel de recompensas desde otro LocalScript (por ejemplo, un
-- botón de tu menú): require(ReplicatedStorage.InviteRewards).openPanel()
local openRequested = Instance.new("BindableEvent")
InviteRewards.OpenRequested = openRequested.Event

function InviteRewards.openPanel()
	openRequested:Fire()
end

return InviteRewards
