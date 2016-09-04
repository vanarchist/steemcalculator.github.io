function getSteemPlotter(calculator, callback) {
    var plotter = {};
    this.calculator = calculator;

    plotter.plotRewardsBySP = function(start_vests, end_vests, current_shares, plottarget) {
        var x = [];
        var y = [];
        var increment = (end_vests - start_vests) / 100;
        for (vests = start_vests; vests <= end_vests; vests += increment) {
            var vote_rshares = calculator.calculateVoteRewardShares(10000, 10000, vests);
            var vote_weight = calculator.calculateVoteWeight(current_shares, current_shares + vote_rshares);
            var post_payout = calculator.calculatePostPayout(current_shares + vote_rshares);
            var vote_value = calculator.calculateVotePayout(post_payout, vote_weight, calculator.calculateWeight(current_shares + vote_rshares));

            x.push(calculator.vestsToSP(vests));
            y.push(vote_value);
        }
        var trace = {
            x: x,
            y: y,
            mode: 'lines+markers',
            name: 'Curation Reward'
        };

        var layout = {
            title: 'Minimum Curation Reward when different users vote on this post (current payout of $' + calculator.calculatePostPayout(current_shares) + ')',
            xaxis: {
                title: 'STEEM Power of the Voter'
            },
            yaxis: {
                title: 'Minimum Curation Reward',
                tickprefix: '$'
            }
        };
        Plotly.newPlot(plottarget, [trace], layout);
    }

    plotter.plotRewardsByTargetReward = function(vote_weight, start_shares, end_shares, plottarget) {
        var x = [];
        var y = [];
        var increment = (end_shares - start_shares) / 100;

        for (post_shares = start_shares; post_shares <= end_shares; post_shares += increment) {
          var post_payout = calculator.calculatePostPayout(post_shares);
          var vote_value = calculator.calculateVotePayout(post_payout, vote_weight, calculator.calculateWeight(post_shares));

          x.push(post_payout);
          y.push(vote_value);
        }
        var trace1 = {
            x: x,
            y: y,
            mode: 'lines+markers',
            name: 'Curation Reward'
        };
        var layout = {
          title: 'Potential Curation Rewards based on the final SBD value of the post',
            xaxis: {
                title: 'Final Post Value',
                tickprefix: '$'
            },
            yaxis: {
                title: 'Curation Reward',
                tickprefix: '$'
            }
        };
        Plotly.newPlot(plottarget, [trace1], layout);
    }

    plotter.plotRewardsByCurrentReward = function(current_vests, start_shares, end_shares, target_shares1, target_shares2, target_shares3, plottarget) {
        var x = [];
        var y1 = [];
        var y2 = [];
        var y3 = [];
        var zero_value1, zero_value2, zero_value3;
        var increment = (end_shares - start_shares) / 100;
        var vote_rshares = calculator.calculateVoteRewardShares(10000, 10000, current_vests);
        for (post_shares = start_shares; post_shares <= end_shares; post_shares += increment) {
          var post_payout = calculator.calculatePostPayout(post_shares);

          var vote_weight = calculator.calculateVoteWeight(post_shares, post_shares + vote_rshares);

          var vote_value1 = post_shares > target_shares1 || zero_value1 ? undefined : calculator.calculateVotePayout(calculator.calculatePostPayout(target_shares1), vote_weight, calculator.calculateWeight(target_shares1));
          var vote_value2 = post_shares > target_shares2 || zero_value2 ? undefined : calculator.calculateVotePayout(calculator.calculatePostPayout(target_shares2), vote_weight, calculator.calculateWeight(target_shares2));
          var vote_value3 = post_shares > target_shares3 || zero_value3 ? undefined : calculator.calculateVotePayout(calculator.calculatePostPayout(target_shares3), vote_weight, calculator.calculateWeight(target_shares3));

          if (vote_value1 == 0) zero_value1 = post_shares;
          if (vote_value2 == 0) zero_value2 = post_shares;
          if (vote_value3 == 0) zero_value3 = post_shares;

          x.push(post_payout);
          y1.push(vote_value1);
          y2.push(vote_value2);
          y3.push(vote_value3);

          if (zero_value1 && zero_value2 && zero_value3)
              break;
        }
        var trace1 = {
            x: x,
            y: y1,
            mode: 'lines+markers',
            name: 'Curation Reward if Post reaches $' + calculator.toSBD(calculator.calculatePostPayout(target_shares1, 10000))
        };
        var trace2 = {
            x: x,
            y: y2,
            mode: 'lines+markers',
            name: 'Curation Reward if Post reaches $' + calculator.toSBD(calculator.calculatePostPayout(target_shares2, 10000))
        };
        var trace3 = {
            x: x,
            y: y3,
            mode: 'lines+markers',
            name: 'Curation Reward if Post reaches $' + calculator.toSBD(calculator.calculatePostPayout(target_shares3, 10000))
        };
        var layout = {
            title: 'Curation Reward when voting with ' + calculator.vestsToSP(current_vests) + 'SP',
            xaxis: {
                title: 'Post Value When Voting',
                tickprefix: '$'
            },
            yaxis: {
                title: 'Curation Reward',
                tickprefix: '$'
            },
        };
        Plotly.newPlot(plottarget, [trace1, trace2, trace3], layout);
    }

    plotter.plotVotingPowerUsage = function(username, votes, plottarget, plottarget2) {
      var voting_power = 10000;
      var new_voting_power = 10000;
      var x = [];
      var y = [];
      var new_y = [];
      var text = [];

      var power_y = [];
      var new_power_y = [];

      var total_power_spent = 0;
      var new_total_power_spent = 0;
      var total_spillover = 0;
      var new_total_spillover = 0;

      var last_vote;
      for (var i = 0; i < votes.length; i++) {
        vote = votes[i];
        if (last_vote) {
          total_spillover += calculator.regenerateSpillover(voting_power, last_vote, vote.time);
          new_total_spillover += calculator.regenerateSpillover(new_voting_power, last_vote, vote.time);
          voting_power = calculator.regenerateVotingPower(voting_power, last_vote, vote.time);
          new_voting_power = calculator.regenerateVotingPower(new_voting_power, last_vote, vote.time);
        }
        var used_power = calculator.calculateUsedPower(voting_power, vote.percent);
        var new_used_power = calculator.calculateNewUsedPower(new_voting_power, vote.percent);

        x.push(i);
        y.push((voting_power / 100).toFixed(2));
        new_y.push((new_voting_power / 100).toFixed(2));

        power_y.push(used_power);
        new_power_y.push(new_used_power);

        text.push(vote.authorperm);
        total_power_spent += used_power;
        new_total_power_spent += new_used_power;
        voting_power -= used_power;
        new_voting_power -= new_used_power;
        last_vote = vote.time;
      }
      var trace = {
          x: x,
          y: y,
          text: text,
          mode: 'lines+markers',
          name: 'Voting Power'
      };
      var trace2 = {
          x: x,
          y: new_y,
          mode: 'lines+markers',
          name: 'New Voting Power'
      };

      var layout = {
          title: 'Historical Voting Power fluctuation for @' + username,
          xaxis: {
              title: 'Vote #'
          },
          yaxis: {
              title: 'Voting Power',
              ticksuffix: '%'
          }
      };
      Plotly.newPlot(plottarget, [trace, trace2], layout);

      var trace = {
          x: x,
          y: power_y,
          text: text,
          mode: 'lines+markers',
          name: 'Spent Power'
      };
      var trace2 = {
          x: x,
          y: new_power_y,
          mode: 'lines+markers',
          name: 'New Spent Power'
      };

      var layout = {
          title: 'Spent power per vote for @' + username,
          xaxis: {
              title: 'Vote #'
          },
          yaxis: {
              title: 'Vote Power',
          }
      };
      Plotly.newPlot(plottarget2, [trace, trace2], layout);
      $('#user_name').text(username);
      $('#num_votes').text(votes.length);
      $('#used_power').text(total_power_spent.toFixed(0));
      $('#spillover').text(total_spillover.toFixed(0));
      $('#new_used_power').text(new_total_power_spent.toFixed(0));
      $('#new_spillover').text(new_total_spillover.toFixed(0));

    }

    return callback(plotter);
}
