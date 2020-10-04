
export function getBoundMethods<T extends object, U extends keyof T>(inst: T, ...methods: U[]): Pick<T, U> {
  const result = {} as Pick<T, U>;
  for (const name of methods) {
    const prop = inst[name];
    if (prop instanceof Function) {
      result[name] = prop.bind(inst);
    } else {
      throw new Error(`Property ${name} is not a function`);
    }
  }
  return result;
}

export function getRandomNumber(minimum: number, maximum: number) {
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}
