import { LevelSelect } from '@/components/LevelSelect';
import { Player } from '@/components/Player';
import { Stats } from '@/components/Stats';
import { createMemoryHistory, createRouter, RouteRecordRaw } from 'vue-router';
import { TrainingContainer } from '@/components/TrainingContainer';

export const routeNames = {
  main: 'levels',
  training: 'training',
  levels: 'levels',
  player: 'player',
  stats: 'stats',
}

const routes: RouteRecordRaw[] = [
  { path: '/levels', component: LevelSelect, name: 'levels' },
  {
    path: '/training', component: TrainingContainer, name: 'training', children: [
      { path: '/player', component: Player, name: 'player' },
      { path: '/stats', component: Stats, name: 'stats' },
    ]
  },
  { path: '/', redirect: '/levels' },
];

const history = createMemoryHistory();

export default createRouter({ history, routes });
