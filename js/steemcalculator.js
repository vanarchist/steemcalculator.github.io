function getCalculator(callback) {
    var calculator = {};
    const content_constant = 2000000000000;

    calculator.vestsToSP = function(vests) {
      return Number(((this.total_vest_steem * (vests / this.total_vests))/1000).toFixed(3));
    }

    calculator.SPtoVests = function(SP) {
      return Number((((SP * 1000) / this.total_vest_steem) * this.total_vests).toFixed(3))
    }

    calculator.calculateUsedPower = function(voting_power, voting_percent) {
      var used_power = (voting_power * voting_percent) / 10000;
      return Math.abs((used_power / 200) + 1);
    }

    calculator.calculateNewUsedPower = function(voting_power, voting_percent) {
      var used_power = (voting_power * voting_percent) / 10000;
      return Math.abs((used_power + 25 - 1) / 25);
    }

    calculator.calculateVoteRewardShares = function(voting_power, voting_percent, vesting_shares) {
      return (this.calculateUsedPower(voting_power, voting_percent) * vesting_shares) / 10000;
    }

    calculator.calculateWeight = function(shares) {
      var max_uint64 = 18446744073709551615;

      return (max_uint64 * shares) / (2 * content_constant + shares);
    }

    calculator.calculateVoteWeight = function(net_rshares, post_rshares) {
      return this.calculateWeight(post_rshares) - this.calculateWeight(net_rshares);
    }

    calculator.calculateVShares = function(rshares) {
       return ( rshares + content_constant ) * ( rshares + content_constant ) - content_constant * content_constant;
    }

    calculator.calculatePostPayout = function(rshares, post_reward_weight = 10000) {
        var rs2 = this.calculateVShares( rshares )
        rs2 = ( rs2 * post_reward_weight ) / 10000;

        payout = ( this.total_reward_fund_steem * rs2 ) / this.total_reward_shares2;

        sbd_payout_value = this.toSBD( payout );

        return sbd_payout_value;
    }

    calculator.calculateVotePayout = function(post_payout, vote_weight, post_reward_weight) {
      const curation_rewards_percent = 25 / 100;

      var curation_rewards = post_payout * curation_rewards_percent;
      return Number(((curation_rewards * vote_weight ) / post_reward_weight).toFixed(3));
    }

    calculator.calculateVotePercentage = function (vote_weight, total_shares)  {
        return  Number(((100 * vote_weight) / calculator.calculateWeight(total_shares)).toFixed(3));
    }

    calculator.calculateVotePercentageWithWeight = function (vote_weight, post_vote_weight)  {
        return  Number(((100 * vote_weight) / post_vote_weight));
    }

    calculator.calculatePenaltyValue = function(post_created, current_time) {
        const thirty_minutes = 30 * 60;
        var post_age = (current_time - post_created) / 1000;
        var delta_t = Math.min(thirty_minutes, post_age);
        return delta_t / thirty_minutes;
    }

    calculator.calculateAjustedPenaltyWeight = function(vote_weight, penalty_value) {
        return vote_weight * penalty_value;
    }

    calculator.regenerateVotingPower = function(voting_power, last_vote_time, current_time) {
      const vote_regeneration_seconds = 5*60*60*24;
      var elapsed_seconds = (new Date(current_time) - new Date(last_vote_time)) / 1000;
      var regenerated_power = (10000 * elapsed_seconds) / vote_regeneration_seconds;
      return Math.min(voting_power + regenerated_power, 10000);
    }

    calculator.regenerateSpillover = function(voting_power, last_vote_time, current_time) {
      const vote_regeneration_seconds = 5*60*60*24;
      var elapsed_seconds = (new Date(current_time) - new Date(last_vote_time)) / 1000;
      var regenerated_power = (10000 * elapsed_seconds) / vote_regeneration_seconds;
      return Math.max(0, (voting_power + regenerated_power) - 10000);
    }

    calculator.toSBD = function(steem) {
        return Number((steem * calculator.current_median_history).toFixed(3));
    }

    calculator.SBDtoShares = function(sbd) {
      var payout = sbd / calculator.current_median_history;
      var rs2 = (this.total_reward_shares2 * payout) / this.total_reward_fund_steem;

      var rshares = Math.sqrt(content_constant * content_constant + rs2) - content_constant;

      return rshares;
    }

    calculator.loadUser = function(username, callback, callback_error) {
        steem.send('call', [0, "get_accounts", [[username]]], function(response) {
            var user = {};
            user.voting_power = Number(response[0].voting_power);
            user.vesting_shares = Number(response[0].vesting_shares.replace(" VESTS", "").replace(".", ""));
            callback(user);
        });
    }

    calculator.loadPost = function(posturl, callback, callback_error) {
      steem.send('call', [0, "get_state", [posturl]], function(response) {
          var post = {};
          post.time = new Date(response.props.time);
          var dict = response.content;
          for (content in dict) {
              if (dict[content].depth == 0) {
                  post.net_rshares = Number(dict[content].net_rshares);
                  post.created = new Date(dict[content].created);
                  post.total_vote_weight = Number(dict[content].total_vote_weight);
                  post.reward_weight = Number(dict[content].reward_weight);
                  break;
              }
          }
          if (post.net_rshares) {
              callback(post);
          } else {
              callback_error();
          }
      });
    }

    calculator.loadContent = function(username, permlink, callback) {
      steem.send('call', [0, "get_content", [username, permlink]], function(response) {
          var content = {};

          content.url = 'https://steemit.com' + response.url;
          content.title = response.root_title;
          content.pending_payout_value = response.pending_payout_value;
          content.net_votes = response.net_votes;
          content.children = response.children;
          content.created = response.created;

          callback(content);
      });
    }

    function parseTransfer(t, transfer) {
      t.timestamp = transfer.timestamp;
      t.from = transfer.op[1].from;
      var to_split = transfer.op[1].memo.split('/');
      t.to = to_split[0].substring(1);
      t.permlink = to_split[1];
      t.amount =  transfer.op[1].amount;
      t.memo = transfer.op[1].memo;
    }

    var last_transfer;
    var last_username;
    calculator.loadTransfers = function(username, callback) {
      last_username = username;
      steem.send('call', [0, "get_account_history", [username, -1, 5]], function(response) {
          var transfers = [];
          for (idx in response) {
            var transfer = response[idx][1];
            if (transfer.op[0] == 'transfer') {
              var t = {};
              parseTransfer(t, transfer);
              last_transfer = response[idx][0];
              transfers.push(t);
            }
          }
          callback(transfers);
      });
    }

    calculator.loadNextTransfers = function(callback) {
      steem.send('call', [0, "get_account_history", [last_username, last_transfer + 5, 5]], function(response) {
          var transfers = [];
          for (idx in response) {
            var transfer = response[idx][1];
            if (transfer.op[0] == 'transfer' && response[idx][0] > last_transfer) {
              var t = {};
              parseTransfer(t, transfer);
              last_transfer = response[idx][0];
              transfers.push(t);
            }
          }
          callback(transfers);
      });
    }

    calculator.loadAccountVotes = function(username, callback) {
      steem.send('call', [0, 'get_account_votes', [username]], function(response) {
        var votes = [];
        for (var i = 0; i < response.length; i++) {
          var r = response[i];
          var v = {};
          v.time = r.time;
          v.percent = r.percent;
          v.authorperm = r.authorperm;
          votes.push(v);
        }
        votes.sort(function(a,b) {return (a.time > b.time) ? 1 : ((b.time > a.time) ? -1 : 0);} );
        callback(votes);
      });
    }


    var server = 'wss://steemd.steemitdev.com';
    var ws = new WebSocketWrapper(server);
    var steem;
    ws.connect().then(function(response) {
        steem = new SteemWrapper(ws);
        steem.send('call', [0, "get_dynamic_global_properties", [[]]], function(response) {

          calculator.total_vests = Number(response.total_vesting_shares.replace(" VESTS", "").replace(".", ""));
          calculator.total_vest_steem = Number(response.total_vesting_fund_steem.replace(" STEEM", "").replace(".", ""));
          calculator.total_reward_fund_steem = Number(response.total_reward_fund_steem.replace(" STEEM", ""));
          calculator.total_reward_shares2 = Number(response.total_reward_shares2);
          steem.send('call', [0, "get_feed_history", [[]]], function(response) {
              calculator.current_median_history = Number(response.current_median_history.base.replace(" SBD", ""));
              return callback(calculator);
          });
        });
    });
}
