import { useObservable } from '@/lib/rx-vue';
import { GroupType, PlaybackType } from '@/models/Levels';
import router, { routeNames } from '@/router';
import { LevelsSelectorToken } from '@/services/render/LevelsSelector';
import { map } from 'rxjs/operators';
import { Container } from 'typedi';
import { classes, stylesheet } from 'typestyle';
import { defineComponent } from 'vue';

const css = stylesheet({
  choiceButton: {
    marginTop: '10px',
  },
  title: {
    marginTop: '20px',
  },
  group: {
    marginBottom: '20px',
  },
});

export const LevelSelect = defineComponent({
  setup() {
    const levelTypes: GroupType[] = ['consonant', 'dissonant', 'all'];
    const levelsSelector = Container.get(LevelsSelectorToken);
    const levels = useObservable(levelsSelector.levels$.pipe(map((lvls) => {
      const consonant = lvls.diads.filter(lvl => lvl.group === 'consonant');
      const dissonant = lvls.diads.filter(lvl => lvl.group === 'dissonant');
      const all = lvls.diads.filter(lvl => lvl.group === 'all');
      return { consonant, dissonant, all };
    })));
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
      let levelsMenu = <div></div>;
      if (levels.value) {
        levelsMenu = (
          <div>
            {levelTypes.map((type) => {
              return (
                <div class={classes(css.group)}>
                  {levels.value[type].map((level) => {
                    return (
                      <div>
                        <button
                          class={classes(css.choiceButton, 'button', 'is-small', 'is-rounded')}
                          onClick={() => selectLevel(level.id)}
                        >
                          {level.name}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        );
      }

      const playbackTypeSeletor = (
        <div class='buttons has-addons'>
          {
            playbackTypes.map(lvl =>
              <button
                class={classes('button', lvl === playbackType.value ? 'is-info' : '')}
                onClick={() => selectPlaybackType(lvl)}
              >
                {levelsSelector.getPlaybackName(lvl)}
              </button>
            )
          }
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
