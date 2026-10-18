// ELK Layered x-order for scripts/pbi_diagram.py: {nodes, edges, w, h, direction} on stdin, {table: [x, y]} on stdout.
const ELK = require('elkjs');
const elk = new ELK();
let raw = '';
process.stdin.on('data', d => (raw += d));
process.stdin.on('end', async () => {
  const g = JSON.parse(raw);
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': g.direction || 'DOWN',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.spacing.nodeNodeBetweenLayers': '120',
      'elk.spacing.nodeNode': '40',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.separateConnectedComponents': 'true',
      'elk.spacing.componentComponent': '120',
    },
    children: g.nodes.map(n => ({ id: n, width: g.w, height: g.h })),
    edges: g.edges.map(([s, t], i) => ({ id: 'e' + i, sources: [s], targets: [t] })),
  };
  const out = await elk.layout(graph);
  const pos = {};
  for (const c of out.children) pos[c.id] = [Math.round(c.x / 20) * 20, Math.round(c.y / 20) * 20];
  process.stdout.write(JSON.stringify(pos));
});
