# echolotl.lol

This repository contains echolotl.lol's source as a Bun workspace. You could build it but idk why you would... 
The backend is written using Elysia and runs on Bun.

This is a running log of the services currently contained in this monorepo. You can see the shared packages' descriptions in the [package's folder's README](./packages/README.md).

Shared backend and frontend API types live in the `@echolotl/types` workspace package.

| Service    | Description                                                                                                                                                                                                                                                                        |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend` | The [Nuxt](https://nuxt.com/) app that creates the statically generated website for [echolotl.lol](https://echolotl.lol/). I'd like to move this to Astro or something similar one day because I _DO NOT_ utilize Nuxt, and it's quite heavy. That will be really annoying though. |
| `backend`  | Handles all the stuff that the frontend needs that requires an actual server/database/persistent storage. Made with Elysia, runs on Bun.                                                                                                                                           |
