import { defineComponent, onMounted } from 'vue';
import router, { routeNames } from '@/router';

export const TrainingContainer = defineComponent({
  setup() {
    function goPlayer() {
      router.push({ name: routeNames.player });
    }
    function goStats() {
      router.push({ name: routeNames.stats });
    }
    onMounted(() => {
      goPlayer();
    });
    return () => {
      return (
        <div>
          <div class='tabs'>
            <ul>
              <li class={router.currentRoute.value?.name === routeNames.player ? 'is-active' : ''}>
                <a onClick={goPlayer}>Player</a>
              </li>
              <li class={router.currentRoute.value?.name === routeNames.stats ? 'is-active' : ''}>
                <a onClick={goStats}>Stats</a>
              </li>
            </ul>
          </div>
          <router-view></router-view>
        </div>
      )
    }
  }
});
