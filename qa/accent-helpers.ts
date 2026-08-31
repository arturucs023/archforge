/* Re-exporta el módulo real + alias estable para tests. */
export * from '../src/lib/accent'
import { hexToRgbTriplet } from '../src/lib/accent'
export const hexToRgbTripletSafe = hexToRgbTriplet
