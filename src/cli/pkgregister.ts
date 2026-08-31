/* Registro de los gestores de paquetes simulados.
   Se importa por efectos laterales desde engine.ts. */

import { registerAptCommand } from './aptcmd'
import { registerPacmanCommand } from './pacmancmd'

registerAptCommand()
registerPacmanCommand()
