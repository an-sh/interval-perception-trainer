import { getBoundMethods } from '@/lib/bind-utils';
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
    const { playRandom, repeat, repeatPerfect, makeChoice, getIntervalName, getIntervalNoteNames, exit } = getBoundMethods(
      state, 'playRandom', 'repeat', 'repeatPerfect', 'makeChoice', 'getIntervalName', 'getIntervalNoteNames', 'exit',
    );

    const isCorrect = computed(() => currentInterval?.value?.interval === selectedIntervalId?.value);

    return () => {
      let intervalSelect = <div></div>;
      if (currentInterval.value && level.value) {
        intervalSelect = level.value.intervals.map((id) => {
          const name = getIntervalName(id);
          if (showResult.value) {
            let classString = 'button is-small';
            if (isCorrect.value && id === selectedIntervalId.value) {
              classString += ' is-success';
            } else if (!isCorrect.value && id === selectedIntervalId.value) {
              classString += ' is-danger';
            } else if (!isCorrect.value && id === currentInterval.value?.interval) {
              classString += ' is-primary';
            }
            return <div class={css.choiceButton}><button class={classString} disabled>{name}</button></div>;
          } else {
            return <div class={css.choiceButton}><button class='button is-small' onClick={() => makeChoice(id)}>{name}</button></div>;
          }
        });
      }
      let controlls = <div></div>;
      if (level.value) {
        controlls = (
          <div class={classes(css.controls)}>
            {showResult.value || !currentInterval.value ? <button class={classes(css.actionButton, 'button')} onClick={exit}>Exit</button> : ''}
            {currentInterval.value ? <button class={classes(css.actionButton, 'button')} onClick={repeat}>Repeat TET</button> : ''}
            {currentInterval.value ? <button class={classes(css.actionButton, 'button')} onClick={repeatPerfect}>Play Pure</button> : ''}
            {showResult.value || !currentInterval.value ? <button class={classes(css.actionButton, 'button is-primary')} onClick={playRandom}>Next</button> : ''}
          </div>
        );
      }
      return (
        <div class='container is-fluid'>
          <p class={classes(css.title, 'subtitle', 'is-5')}>{level.value?.name}</p>
          {controlls}
          {intervalSelect}
          {
            showResult.value && currentInterval.value ?
              <div class={classes(css.noteNames, 'is-size-7')}>Interval: {getIntervalNoteNames(currentInterval.value)}</div> :
              ''
          }
        </div>
      );
    }
  },
});
