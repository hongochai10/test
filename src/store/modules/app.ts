import { getScores } from '@bonustrack/snapshot.js/src/utils';
import client from '@/helpers/client';
import ipfs from '@/helpers/ipfs';
import providers from '@/helpers/providers';
import { formatProposal, formatProposals } from '@/helpers/utils';
import { version } from '@/../package.json';

const mutations = {
  SEND_REQUEST() {
    console.debug('SEND_REQUEST');
  },
  SEND_SUCCESS() {
    console.debug('SEND_SUCCESS');
  },
  SEND_FAILURE(_state, payload) {
    console.debug('SEND_FAILURE', payload);
  },
  GET_PROPOSALS_REQUEST() {
    console.debug('GET_PROPOSALS_REQUEST');
  },
  GET_PROPOSALS_SUCCESS() {
    console.debug('GET_PROPOSALS_SUCCESS');
  },
  GET_PROPOSALS_FAILURE(_state, payload) {
    console.debug('GET_PROPOSALS_FAILURE', payload);
  },
  GET_PROPOSAL_REQUEST() {
    console.debug('GET_PROPOSAL_REQUEST');
  },
  GET_PROPOSAL_SUCCESS() {
    console.debug('GET_PROPOSAL_SUCCESS');
  },
  GET_PROPOSAL_FAILURE(_state, payload) {
    console.debug('GET_PROPOSAL_FAILURE', payload);
  },
  GET_POWER_REQUEST() {
    console.debug('GET_POWER_REQUEST');
  },
  GET_POWER_SUCCESS() {
    console.debug('GET_POWER_SUCCESS');
  },
  GET_POWER_FAILURE(_state, payload) {
    console.debug('GET_POWER_FAILURE', payload);
  }
};

const actions = {
  send: async ({ commit, dispatch, rootState }, { token, type, payload }) => {
    commit('SEND_REQUEST');
    try {
      const msg: any = {
        address: rootState.web3.account,
        msg: JSON.stringify({
          version,
          timestamp: (Date.now() / 1e3).toFixed(),
          token,
          type,
          payload
        })
      };
      msg.sig = await dispatch('signMessage', msg.msg);
      const result = await client.request('message', msg);
      commit('SEND_SUCCESS');
      dispatch('notify', ['green', `Your ${type} is in!`]);
      return result;
    } catch (e) {
      commit('SEND_FAILURE', e);
      const errorMessage =
        e && e.error_description
          ? `Oops, ${e.error_description}`
          : 'Oops, something went wrong!';
      dispatch('notify', ['red', errorMessage]);
      return;
    }
  },
  getProposals: async ({ commit, rootState }, space) => {
    commit('GET_PROPOSALS_REQUEST');
    try {
      let proposals: any = await client.request(`${space.address}/proposals`);
      if (proposals) {
        const defaultStrategies = [
          [
            'erc20-balance-of',
            { address: space.address, decimals: space.decimals }
          ]
        ];
        // const scores: any = await getScores(
        //   space.strategies || defaultStrategies,
        //   rootState.web3.network.chainId || "",
        //   providers.rpc || "https://rpc.kardiachain.io",
        //   Object.values(proposals).map((proposal: any) => proposal.address)
        // );
        // proposals = Object.fromEntries(
        //   Object.entries(proposals).map((proposal: any) => {
        //     proposal[1].score = scores.reduce(
        //       (a, b) => a + b[proposal[1].address],
        //       0
        //     );
        //     return [proposal[0], proposal[1]];
        //   })
        // );
      }
      commit('GET_PROPOSALS_SUCCESS');
      return formatProposals(proposals);
    } catch (e) {
      commit('GET_PROPOSALS_FAILURE', e);
    }
  },
  getProposal: async ({ commit, rootState }, payload) => {
    commit('GET_PROPOSAL_REQUEST');
    try {
      const result: any = {};
      const [proposal, votes] = await Promise.all([
        ipfs.get(payload.id),
        client.request(`${payload.space.address}/proposal/${payload.id}`)
      ]);
      result.proposal = formatProposal(proposal);
      result.proposal.ipfsHash = payload.id;
      result.votes = votes;
      const { snapshot } = result.proposal.msg.payload;
      const blockTag =
        snapshot > rootState.web3.blockNumber ? 'latest' : parseInt(snapshot);
      const defaultStrategies = [
        [
          'erc20-balance-of',
          { address: payload.space.address, decimals: payload.space.decimals }
        ]
      ];
      const spaceStrategies = payload.space.strategies || defaultStrategies;
      let scores;
      try {
        scores = await getScores(
          spaceStrategies,
          rootState.web3.network.chainId,
          providers.rpc,
          Object.keys(result.votes),
          // @ts-ignore
          blockTag
        );
      } catch (e) {
        scores = [{}];
      }
      console.log('Scores', scores);
      result.votes = Object.fromEntries(
        Object.entries(result.votes)
          .map((vote: any) => {
            vote[1].scores = spaceStrategies.map(
              (strategy, i) => scores[i][vote[1].address] || 0
            );
            vote[1].balance = vote[1].scores.reduce((a, b: any) => a + b, 0);
            return vote;
          })
          .sort((a, b) => b[1].balance - a[1].balance)
          .filter(vote => vote[1].balance > 0)
      );
      result.results = {
        totalVotes: result.proposal.msg.payload.choices.map(
          (choice, i) =>
            Object.values(result.votes).filter(
              (vote: any) => vote.msg.payload.choice === i + 1
            ).length
        ),
        totalBalances: result.proposal.msg.payload.choices.map((choice, i) =>
          Object.values(result.votes)
            .filter((vote: any) => vote.msg.payload.choice === i + 1)
            .reduce((a, b: any) => a + b.balance, 0)
        ),
        totalScores: result.proposal.msg.payload.choices.map((choice, i) =>
          spaceStrategies.map((strategy, sI) =>
            Object.values(result.votes)
              .filter((vote: any) => vote.msg.payload.choice === i + 1)
              .reduce((a, b: any) => a + b.scores[sI], 0)
          )
        ),
        totalVotesBalances: Object.values(result.votes).reduce(
          (a, b: any) => a + b.balance,
          0
        )
      };
      commit('GET_PROPOSAL_SUCCESS');
      return result;
    } catch (e) {
      commit('GET_PROPOSAL_FAILURE', e);
    }
  },
  getPower: async ({ commit, rootState }, { space, address, snapshot }) => {
    commit('GET_POWER_REQUEST');
    try {
      const blockTag =
        snapshot > rootState.web3.blockNumber ? 'latest' : parseInt(snapshot);
      const defaultStrategies = [
        [
          'erc20-balance-of',
          { address: space.address, decimals: space.decimals }
        ]
      ];
      let scores;
      try {
        scores = await getScores(
          space.strategies || defaultStrategies,
          rootState.web3.network.chainId,
          providers.rpc,
          [address],
          // @ts-ignore
          blockTag
        );
      } catch (e) {
        scores = [{}];
      }
      scores = scores.map((score: any) =>
        Object.values(score).reduce((a, b: any) => a + b, 0)
      );
      commit('GET_POWER_SUCCESS');
      return {
        scores,
        totalScore: scores.reduce((a, b: any) => a + b, 0)
      };
    } catch (e) {
      commit('GET_POWER_FAILURE', e);
    }
  }
};

export default {
  mutations,
  actions
};
