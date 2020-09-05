import { StatsTrackerToken } from '@/services/render/StatsTracker';
import Container from 'typedi';
import { defineComponent } from 'vue';

export const Stats = defineComponent({
  setup() {
    const stats = Container.get(StatsTrackerToken);
    const currentStats = stats.getStatsData();
    return () => {
      return (
        <div class='container is-fluid'>
          <table class='table'>
            <thead>
              <tr>
                <th>Name</th>
                <th>Count</th>
                <th>Ratio</th>
              </tr>
            </thead>
            <tbody>
              {currentStats.items.map((stat) => (
                <tr>
                  <td>{stat.name}</td>
                  <td>{stat.count}</td>
                  <td>{stat.ratio.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div class='has-text-weight-medium'>
            Total Count: {currentStats.totalCount}
          </div>
          <div class='has-text-weight-medium'>
            Total Ratio: {currentStats.totalRatio.toFixed(2)}
          </div>
        </div>
      )
    }
  }
});
