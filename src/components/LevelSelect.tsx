import { useObservable } from '@/lib/rx-vue';
import { PlaybackType } from '@/models/Levels';
import { InstrumentType } from '@/models/SampleTable';
import router, { routeNames } from '@/router';
import { LevelsSelectorToken } from '@/services/render/LevelsSelector';
import { Container } from 'typedi';
import { classes, stylesheet } from 'typestyle';
import { defineComponent } from 'vue';

const css = stylesheet({
  choiceButton: {
    marginTop: '10px',
  },
  title: {
    marginTop: '20px',
  }
});

export const LevelSelect = defineComponent({
  setup() {
    const levelsSelector = Container.get(LevelsSelectorToken);
    const levels = useObservable(levelsSelector.levels$);
    const playbackType = useObservable(levelsSelector.playbackType$);

    const playbackTypes = levelsSelector.getAllPlaybackTypes();

    function selectLevel(id: number) {
      levelsSelector.selectLevel(id);
      router.push({ name: routeNames.training });
    }

    function selectPlaybackType(type: PlaybackType) {
      levelsSelector.selectPlaybackType(type);
    }

    return () => {
      const levelsMenu =
        levels.value ?
          levels.value.diads.map((level) => {
            return (
              <div>
                <button class={classes(css.choiceButton, 'button', 'is-small', 'is-rounded')} onClick={() => selectLevel(level.id)}>{level.name}</button>
              </div>
            );
          }) :
          <div></div>;
      const playbackTypeSeletor = (
        <div class='buttons has-addons'>
          {playbackTypes.map(lvl => <button class={classes('button', lvl === playbackType.value ? 'is-info' : '')} onClick={() => selectPlaybackType(lvl)}>{levelsSelector.getPlaybackName(lvl)}</button>)}
        </div>
      );
      if (playbackType) {
        return (
          <div class='container is-fluid'>
            <p class={classes(css.title, 'subtitle', 'is-5')}>Select Training</p>
            {playbackTypeSeletor}
            {levelsMenu}
          </div>
        );
      }
    }
  }
});
