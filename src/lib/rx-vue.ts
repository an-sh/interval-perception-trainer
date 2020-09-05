import { ref, Ref, onBeforeUnmount } from 'vue';
import { Observable } from 'rxjs';

function subscribeTo<T>(
  observable: Observable<T>,
  next?: (value: T) => void,
  error?: (err: any) => void,
  complete?: () => void
) {
  const subscription = observable.subscribe(next, error, complete);
  onBeforeUnmount(() => {
    subscription.unsubscribe();
  });
  return subscription;
}

export function useObservable<T>(
  observable: Observable<T>,
  defaultValue?: T
): Ref<T> {
  const handler = ref(defaultValue) as Ref<T>;
  subscribeTo(
    observable,
    value => {
      handler.value = value;
    },
    error => {
      throw error;
    }
  );
  return handler;
}

export function useSubscription<T>(
  observable: Observable<T>,
  next?: (value: T) => void,
  error?: (err: any) => void,
  complete?: () => void
) {
  return subscribeTo(observable, next, error, complete);
}
