import { useObservable } from '@/lib/rx-vue';
import { CustomRoot, GroupType, PlaybackType } from '@/models/Levels';
import router, { routeNames } from '@/router';
import { LevelsSelectorToken } from '@/services/render/LevelsSelector';
import { map } from 'rxjs/operators';
import { Container } from 'typedi';
import { classes, stylesheet } from 'typestyle';
import { computed, defineComponent } from 'vue';

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
  customRoots: {
    marginBottom: '20px',
    maxWidth: '600px',
  },
  rootItem: {
    marginRight: '10px',
    whiteSpace: 'nowrap',
  },
  rootBox: {
    marginRight: '2px',
  }
});

export const LevelSelect = defineComponent({
  setup() {
    const levelsSelector = Container.get(LevelsSelectorToken);

    const levelTypes: GroupType[] = ['consonant', 'dissonant', 'all'];
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

    const customRoots = levelsSelector.getCustomRootsData();
    const selectedRootNotes = useObservable(levelsSelector.customRoots$);
    const rootsData = useObservable(
      levelsSelector.customRoots$.pipe(
        map(selectedRoots => {
          const data = customRoots.map((itm) => {
            const isSelected = selectedRoots.includes(itm.note);
            return { ...itm, isSelected };
          });
          return data;
        }),
      ),
    );

    const tunings = levelsSelector.getTuningTypes();
    const isPerfect = useObservable(levelsSelector.isPerfect$);
    const selectedTuningType = computed(() => levelsSelector.getTuning(isPerfect.value));

    const instruments = levelsSelector.getAllInstrumentTypes();
    const instrument = useObservable(levelsSelector.instrumentType$);

    function selectLevel(id: number) {
      levelsSelector.selectLevel(id);
      router.push({ name: routeNames.training });
    }

    function selectPlaybackType(type: PlaybackType) {
      levelsSelector.selectPlaybackType(type);
    }

    function selectRootRange(arg: any) {
      const range = rootRanges.find(itm => itm.id === arg.target.value);
      if (range) {
        if (range.isCustom && selectedRootNotes.value) {
          levelsSelector.selectCustomRoots(selectedRootNotes.value);
        } else {
          levelsSelector.selectRootRange(range);
        }
      }
    }

    function toggleCustomRoot(item: CustomRoot) {
      if (selectedRootNotes.value) {
        const idx = selectedRootNotes.value.findIndex((itm) => itm === item.note);
        const updatedRootNotes = idx >= 0 ? selectedRootNotes.value.filter((_1, i) => idx !== i) : [...selectedRootNotes.value, item.note];
        levelsSelector.selectCustomRoots(updatedRootNotes);
      }
    }

    function selectTuningType(arg: any) {
      levelsSelector.selectTunungType(arg.target.value);
    }

    function selectInstrument(arg: any) {
      levelsSelector.selectInstrumentType(arg.target.value);
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
            <select value={selectedRootRange.value?.id} onChange={selectRootRange}>
              {rootRanges.map((itm) => {
                return (
                  <option value={itm.id}>{itm.name}</option>
                );
              })}
            </select>
          </div>
          <div class={classes('select', css.optionsItem)}>
            <select value={selectedTuningType.value} onChange={selectTuningType}>
              {tunings.map((itm) => {
                return (
                  <option value={itm}>{capitalize(itm)}</option>
                );
              })}
            </select>
          </div>
          <div class={classes('select', css.optionsItem)}>
            <select value={instrument.value} onChange={selectInstrument}>
              {instruments.map((itm) => {
                return (
                  <option value={itm}>{capitalize(itm)}</option>
                );
              })}
            </select>
          </div>

        </div>
      );

      let customRootsSelector = <div></div>;
      if (selectedRootRange.value && selectedRootRange.value.isCustom && rootsData.value) {
        customRootsSelector = (
          <div class={classes(css.customRoots)}>
            {rootsData.value.map((itm) => {
              return (
                <label class={classes(css.rootItem)}>
                  <input class={classes(css.rootBox)} checked={itm.isSelected} onClick={() => toggleCustomRoot(itm)} type='checkbox' />
                  {itm.name}
                </label>
              );
            })}
          </div>
        );
      }

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
            {customRootsSelector}
            {levelsMenu}
          </div>
        );
      }
    }
  }
});
