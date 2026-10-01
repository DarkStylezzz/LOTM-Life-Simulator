# Recompensas por invitar (BitBeyonder, Roblox)

Un botón **🎁 Invitá amigos** abre un panel con el progreso y dos recompensas. Tocar una recompensa que todavía no tenés, o **Invitar amigos**, abre la ventana de invitaciones de Roblox.

| Meta | Recompensa |
|---|---|
| Tu primera invitación (1 amigo) | Tirada del destino + Puñado de Legado |
| 10 invitaciones (10 amigos) | 11 Tiradas del destino + Cofre de Legado |

Las recompensas son productos que ya vende la tienda, y se entrega lo mismo que da cada uno. Se cambian en `ReplicatedStorage/InviteRewards.luau` (`Rewards`).

## Cuándo cuenta una invitación

Cuando el amigo **entra al juego** con tu invitación. Roblox no le dice al juego a quién invitaste (el evento `GameInvitePromptClosed` llega siempre vacío), pero sí le dice, a quien entra, quién lo invitó (`GetJoinData().ReferredByPlayerId`). Por las dudas, la invitación también lleva tu id en `LaunchData`.

- Cada amigo cuenta una vez para cada persona que lo invita, y nadie se cuenta a sí mismo.
- Cuenta aunque estés desconectado o en otro servidor cuando tu amigo entra: la recompensa llega ahí mismo (por `MessagingService`) o la próxima vez que entres.
- Las invitaciones que se mandan desde el menú de Roblox también cuentan.
- El progreso se guarda en el DataStore `InviteRewards_v1`, aparte de la partida.

## Dónde va cada script

| Archivo | En Studio | Tipo |
|---|---|---|
| `ReplicatedStorage/InviteRewards.luau` | ReplicatedStorage → `InviteRewards` | ModuleScript |
| `ServerScriptService/InviteRewardsGrant.luau` | ServerScriptService → `InviteRewardsGrant` | ModuleScript |
| `ServerScriptService/InviteRewardsServer.server.luau` | ServerScriptService → `InviteRewardsServer` | Script |
| `StarterPlayerScripts/InviteRewardsClient.client.luau` | StarterPlayer → StarterPlayerScripts → `InviteRewardsClient` | LocalScript |

Los nombres tienen que ser exactamente esos. Con Rojo, los sufijos `.server.luau` y `.client.luau` ya son los que espera.

## Lo que falta conectar con el juego

`InviteRewardsGrant` tiene lugar para una función por producto (hoy comentadas), que tiene que dar lo mismo que da ese producto al comprarlo. Lo más simple es llamar a la misma función que usa el `ProcessReceipt` del juego:

| Producto | ID |
|---|---|
| Tirada del destino | 3714719525 |
| Puñado de Legado | 3714719380 |
| 11 Tiradas del destino | 3714719587 |
| Cofre de Legado | 3714719415 |

Mientras una función falte, esa recompensa no se entrega pero tampoco se pierde: queda guardada y llega en cuanto la función exista (en la salida aparece `falta cómo entregar ...`). Si el juego carga la partida al entrar, `Grant.ready` tiene que devolver `true` recién cuando terminó, para no entregar nada antes.

Para abrir el panel desde un menú propio: `require(ReplicatedStorage.InviteRewards).openPanel()`. Con `ShowButton = false` el botón flotante no aparece.

## Probar

- En Studio, el progreso necesita **Game Settings → Security → Enable Studio Access to API Services**. La ventana de invitaciones no se abre en Studio (el panel avisa que no se puede invitar): hay que probarla en el juego publicado.
- Sin Studio: `node roblox/invite-rewards/tests/run.js` corre los escenarios con un Roblox simulado (necesita el ejecutable [`luau`](https://github.com/luau-lang/luau/releases) en el PATH, o su ruta en `LUAU`).
