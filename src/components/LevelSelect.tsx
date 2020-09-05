import { useObservable } from '@/lib/rx-vue';
import { LevelType } from '@/models/Levels';
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
    const selectedType = useObservable(levelsSelector.levelType$);
    const levelTypes = levelsSelector.getAllLevelTypes();

    function selectLevel(id: number) {
      levelsSelector.selectLevel(id);
      router.push({ name: routeNames.training });
    }

    function selectLevelType(levelType: LevelType) {
      levelsSelector.selectType(levelType);
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
      const levelTypeSeletor = (
        <div class='buttons has-addons'>
          {levelTypes.map(lvl => <button class={classes('button', lvl === selectedType.value ? 'is-info' : '')} onClick={() => selectLevelType(lvl)}>{levelsSelector.getTypeName(lvl)}</button>)}
        </div>
      )
      if (selectedType) {
        return (
          <div class='container is-fluid'>
            <p class={classes(css.title, 'subtitle', 'is-5')}>Select Training</p>
            {levelTypeSeletor}
            {levelsMenu}
          </div>
        );
      }
    }
  }
});
