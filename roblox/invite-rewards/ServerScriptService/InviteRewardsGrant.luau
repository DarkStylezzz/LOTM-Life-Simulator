--[[
	InviteRewardsGrant (ModuleScript en ServerScriptService)

	Cómo se entrega cada cosa de las recompensas por invitar. Cada función
	recibe al jugador y tiene que darle lo mismo que da ese producto en la
	tienda: lo más simple es llamar a la misma función que usa tu
	ProcessReceipt para ese producto.

	Mientras una función falte, esa recompensa no se entrega pero tampoco se
	pierde: queda guardada y se entrega en cuanto la función exista.
]]

local Grant = {}

-- true cuando los datos del jugador ya cargaron. Antes de eso no se entrega
-- nada (si tu juego carga la partida al entrar, esperá a que termine).
function Grant.ready(player: Player): boolean
	return true
end

-- Una función por producto (el nombre tiene que ser igual al de "items" en
-- ReplicatedStorage > InviteRewards). Si algo sale mal, que tire un error o
-- devuelva false.
Grant.items = {
	-- Producto 3714719525
	-- ["Tirada del destino"] = function(player)
	-- end,

	-- Producto 3714719380
	-- ["Puñado de Legado"] = function(player)
	-- end,

	-- Producto 3714719587
	-- ["11 Tiradas del destino"] = function(player)
	-- end,

	-- Producto 3714719415
	-- ["Cofre de Legado"] = function(player)
	-- end,
}

return Grant
