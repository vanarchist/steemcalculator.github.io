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

    return callback(plotter);
}
