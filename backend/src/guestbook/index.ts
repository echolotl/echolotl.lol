import Elysia from "elysia";
import { t } from "elysia";
import { userBySession } from "../auth/discord/repository";

export const guestbookRouter = new Elysia({ prefix: "/guestbook" })
  .guard({
    cookie: t.Cookie({ session: t.String() }),
  })
  .resolve(({ cookie: { session }, status }) => {
    const user = userBySession(session.value);
    if (!user) return status(401, "Unauthorized");
    return { user };
  });
