// https://gist.github.com/kuroski/9a7ae8e5e5c9e22985364d1ddbf3389d
export type CamelCase<S extends string> =
  S extends `${infer P1}_${infer P2}${infer P3}`
    ? `${Lowercase<P1>}${Uppercase<P2>}${CamelCase<P3>}`
    : Lowercase<S>;

export type KeysToCamelCase<T> = {
  [K in keyof T as CamelCase<string & K>]: T[K];
};

export type CamelToSnakeCase<S extends string> = S extends `${infer T}${infer U}`
  ? `${T extends Capitalize<T> ? "_" : ""}${Lowercase<T>}${CamelToSnakeCase<U>}`
  : S;

export type KeysToSnakeCase<T> = {
  [K in keyof T as CamelToSnakeCase<string & K>]: T[K];
};

export type ChangeType<Of, To, Where extends keyof Of> = {
  [K in keyof Of]: K extends Where ? To : Of[K];
};

export type BooleanToNumber<T> = T extends boolean ? number : T;

export type DeepBooleanToNumber<T> = {
  [K in keyof T]: BooleanToNumber<T[K]>;
};
