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
  options: {
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'row',
  },
  optionsItem: {
    marginRight: '20px',
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

    const rootRanges = levelsSelector.getOctavesData();
    const selectedRootRange = useObservable(levelsSelector.rootRange$);
    // tslint:disable-next-line prefer-const
    let selectedRootRangeId = selectedRootRange.value?.id;

    const tunungs = levelsSelector.getTuningTypes();
    const isPerfect = useObservable(levelsSelector.isPerfect$);
    // tslint:disable-next-line prefer-const
    let selectedTuningTypeId = levelsSelector.getTuning(isPerfect.value);

    const instruments = levelsSelector.getAllInstrumentTypes();
    const instrument = useObservable(levelsSelector.instrumentType$);
    // tslint:disable-next-line prefer-const
    let selectedInstrumentId = instrument.value;

    function selectLevel(id: number) {
      levelsSelector.selectLevel(id);
      router.push({ name: routeNames.training });
    }

    function selectPlaybackType(type: PlaybackType) {
      levelsSelector.selectPlaybackType(type);
    }

    function selectRootRange() {
      const range = rootRanges.find(itm => itm.id === selectedRootRangeId);
      if (range) {
        levelsSelector.selectRootRange(range);
      }
    }

    function selectTuningType() {
      levelsSelector.setTunungType(selectedTuningTypeId);
    }

    function selectInstrument() {
      levelsSelector.selectInstrumentType(selectedInstrumentId);
    }

    const capitalize = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase());

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

      const optionsSelectors = (
        <div class={classes(css.options)}>
          <div class={classes('select', css.optionsItem)}>
            <select v-model={selectedRootRangeId} onChange={selectRootRange}>
              {rootRanges.map((itm) => {
                return (
                  <option value={itm.id}>{itm.name}</option>
                );
              })}
            </select>
          </div>
          <div class={classes('select', css.optionsItem)}>
            <select v-model={selectedTuningTypeId} onChange={selectTuningType}>
              {tunungs.map((itm) => {
                return (
                  <option value={itm}>{capitalize(itm)}</option>
                );
              })}
            </select>
          </div>
          <div class={classes('select', css.optionsItem)}>
            <select v-model={selectedInstrumentId} onChange={selectInstrument}>
              {instruments.map((itm) => {
                return (
                  <option value={itm}>{capitalize(itm)}</option>
                );
              })}
            </select>
          </div>

        </div>
      );

      const playbackTypeSeletor = (
        <div class='buttons has-addons'>
          {playbackTypes.map(lvl =>
            <button
              class={classes('button', lvl === playbackType.value ? 'is-info' : '')}
              onClick={() => selectPlaybackType(lvl)}
            >
              {levelsSelector.getPlaybackName(lvl)}
            </button>
          )}
        </div>
      );

      if (playbackType) {
        return (
          <div class='container is-fluid'>
            <p class={classes(css.title, 'subtitle', 'is-5')}>Select Training</p>
            {playbackTypeSeletor}
            {optionsSelectors}
            {levelsMenu}
          </div>
        );
      }
    }
  }
});
