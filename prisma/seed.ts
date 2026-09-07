import { prisma } from '../src/db/client';

// Seeds the "Validation Example" graph documented in the project readme so the
// published test cases can be executed against a fresh database. The script is
// idempotent: it upserts a named network, upserts each node, then drops and
// recreates the edge set inside a single transaction.
const NETWORK_NAME = 'readme-validation';

const nodeKeys = ['A', 'B', 'C', 'D', 'E'] as const;

interface SeedEdge {
  fromKey: string;
  toKey: string;
  cost: number;
  maxWeight: number | null;
  noHazardous: boolean;
  trafficMultiplier: number;
}

const edges: SeedEdge[] = [
  {
    fromKey: 'A',
    toKey: 'B',
    cost: 10,
    maxWeight: 10000,
    noHazardous: false,
    trafficMultiplier: 1.0,
  },
  {
    fromKey: 'A',
    toKey: 'C',
    cost: 15,
    maxWeight: 5000,
    noHazardous: true,
    trafficMultiplier: 1.5,
  },
  {
    fromKey: 'B',
    toKey: 'D',
    cost: 12,
    maxWeight: 10000,
    noHazardous: false,
    trafficMultiplier: 2.0,
  },
  { fromKey: 'C', toKey: 'D', cost: 5, maxWeight: 5000, noHazardous: true, trafficMultiplier: 1.0 },
  {
    fromKey: 'D',
    toKey: 'E',
    cost: 10,
    maxWeight: 8000,
    noHazardous: false,
    trafficMultiplier: 1.2,
  },
];

async function main(): Promise<void> {
  const network = await prisma.network.upsert({
    where: { name: NETWORK_NAME },
    update: { heuristicScale: null },
    create: { name: NETWORK_NAME, heuristicScale: null },
  });

  const networkId = network.id;

  await prisma.$transaction([
    ...nodeKeys.map((key) =>
      prisma.node.upsert({
        where: { networkId_key: { networkId, key } },
        update: {},
        create: { networkId, key },
      }),
    ),
    prisma.edge.deleteMany({ where: { networkId } }),
    prisma.edge.createMany({ data: edges.map((e) => ({ ...e, networkId })) }),
  ]);

  console.log(
    `Seeded network ${networkId} (${NETWORK_NAME}): ${nodeKeys.length} nodes, ${edges.length} edges`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
