import { getBoundMethods } from '@/lib/utils';
import { PlayerStateToken } from '@/services/render/PlayerState';
import { Container } from 'typedi';
import { classes, stylesheet } from 'typestyle';
import { defineComponent, computed } from 'vue';

const css = stylesheet({
  choiceButton: {
    marginTop: '10px',
  },
  actionButton: {
    marginRight: '20px',
  },
  title: {
    marginTop: '20px',
  },
  controls: {
    marginBottom: '10px',
  },
  noteNames: {
    marginTop: '20px',
  }
});

export const Player = defineComponent({
  setup() {
    const state = Container.get(PlayerStateToken);

    const { showResult, selectedIntervalId, currentInterval, level } = state;
    const actions = getBoundMethods(
      state,
      'playRandom',
      'repeat',
      'makeChoice',
      'getIntervalName',
      'getIntervalNoteNames',
      'playFromRoot',
      'isMatchingChoice',
      'exit',
    );

    const isCorrect = computed(actions.isMatchingChoice);

    return () => {
      let intervalSelect = <div></div>;
      if (currentInterval.value && level.value) {
        const selectItems = level.value.intervals.map((id) => {
          const name = actions.getIntervalName(id);
          if (showResult.value) {
            let classString = 'button is-small';
            if (isCorrect.value && id === selectedIntervalId.value) {
              classString += ' is-success';
            } else if (!isCorrect.value && id === selectedIntervalId.value) {
              classString += ' is-danger';
            } else if (!isCorrect.value && id === currentInterval.value?.interval) {
              classString += ' is-primary';
            }
            return (
              <div class={css.choiceButton}>
                <button class={classString} onClick={() => actions.playFromRoot(id)}>
                  {name}
                </button>
              </div>
            );
          } else {
            return (
              <div class={css.choiceButton}>
                <button class='button is-small' onClick={() => actions.makeChoice(id)}>
                  {name}
                </button>
              </div>
            );
          }
        });
        intervalSelect = <div>{selectItems}</div>
      }

      let controlls = <div></div>;
      if (level.value) {
        controlls = (
          <div class={classes(css.controls)}>
            {showResult.value || !currentInterval.value ?
              <button class={classes(css.actionButton, 'button')} onClick={actions.exit}>Exit</button> :
              ''}
            {!showResult.value && currentInterval.value ?
              <button class={classes(css.actionButton, 'button')} onClick={actions.repeat}>Repeat</button> :
              ''}
            {showResult.value || !currentInterval.value ?
              <button class={classes(css.actionButton, 'button is-primary')} onClick={actions.playRandom}>Next</button> : ''
            }
          </div>
        );
      }

      return (
        <div class='container is-fluid'>
          <p class={classes(css.title, 'subtitle', 'is-5')}>
            {level.value?.name}
          </p>
          {controlls}
          {intervalSelect}
          {showResult.value && currentInterval.value ?
            <div class={classes(css.noteNames, 'is-size-7')}>
              Interval: {actions.getIntervalNoteNames(currentInterval.value)}
            </div> :
            ''}
        </div>
      );
    }
  },
});
