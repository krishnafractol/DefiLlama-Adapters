const { cachedGraphQuery } = require('../helper/cache')

const vaultsGraphs = {
  ethereum:
    "https://api.mainnet.termfinance.io/mainnet/subgraph/vaults",
  avax:
    "https://api.mainnet.termfinance.io/avalanche/subgraph/vaults",
  base:
    "https://api.mainnet.termfinance.io/base/subgraph/vaults",
  bsc:
    "https://api.mainnet.termfinance.io/bnb/subgraph/vaults",
  arbitrum:
    "https://api.mainnet.termfinance.io/arbitrum/subgraph/vaults",
}

const termVaultStrategiesQuery = `
query termVaultStrategiesQuery($lastId: ID, $block: Int) {
  termVaultStrategies(
    where: {
      id_gt: $lastId,
    },
    first: 1000,
    block: {
      number: $block
    }
  ) {
    id
    asset {
      id
    }
  }
}`

const termVaultStrategiesQueryHeadBlock = `
query termVaultStrategiesQuery($lastId: ID) {
  termVaultStrategies(
    where: {
      id_gt: $lastId,
    },
    first: 1000
  ) {
    id
    asset {
      id
    }
  }
}`

const vaultsGraphStartBlock = {
  ethereum: 21433264,
  avax: 54438973,
  base: 30797402,
  bsc: 54505207,
  arbitrum: 359134348,
}

module.exports = {
  methodology: `Counts deposits in Term Strategy Vaults allocated to other protocols.`,
  // hallmarks: [[1588610042, "TermFinance Launch"]],
};

Object.keys(vaultsGraphs).forEach(chain => {
  const vaultsHost = vaultsGraphs[chain]
  module.exports[chain] = {
    tvl: async (api) => {
      let vaultsData;
      if (!api.block) {
        vaultsData = await cachedGraphQuery(`term-finance-vaults-${chain}-head`, vaultsHost, termVaultStrategiesQueryHeadBlock, { fetchById: true, useBlock: false })
      } else if (api.block >= vaultsGraphStartBlock[chain]) {
        vaultsData = await cachedGraphQuery(`term-finance-vaults-${chain}`, vaultsHost, termVaultStrategiesQuery, { fetchById: true, useBlock: true, variables: { block: api.block } })
      } else {
        vaultsData = []
      }
      const strategyBalances = await api.multiCall({
        abi: 'uint256:totalLiquidBalance',
        calls: vaultsData.map(({ id }) => ({ target: id })),
        permitFailure: false,
      })
      vaultsData.forEach(({ asset: { id } }, i) => {
        api.add(id, strategyBalances[i])
      });

      return api.getBalances()
    },
  }
})
