import type { NetvizId } from '../../types'
import EncapDiagram from './EncapDiagram'
import VlsmSplitter from './VlsmSplitter'
import StpSimulator from './StpSimulator'
import NatTranslator from './NatTranslator'
import OspfExplorer from './OspfExplorer'
import BgpPathSelector from './BgpPathSelector'

export default function NetvizRenderer({ viz, caption }: { viz: NetvizId; caption?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-sky-500/25 bg-ink-950">
      <div className="border-b border-sky-500/15 bg-sky-500/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-sky-300/80">
        Visualización interactiva{caption ? ` — ${caption}` : ''}
      </div>
      <div className="p-4">
        {viz === 'encap' && <EncapDiagram />}
        {viz === 'vlsm' && <VlsmSplitter />}
        {viz === 'stp' && <StpSimulator />}
        {viz === 'nat' && <NatTranslator />}
        {viz === 'ospf' && <OspfExplorer />}
        {viz === 'bgp' && <BgpPathSelector />}
      </div>
    </div>
  )
}
