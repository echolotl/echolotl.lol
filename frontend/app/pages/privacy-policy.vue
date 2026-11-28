<template>
  <div class="privacy-policy">
    <h1>echolotl.lol Privacy Policy</h1>
    <div style="color: var(--text-secondary)">
      Last updated <b>November 28, 2026</b>
    </div>
    <hr />
    <p>
      Hey! Throughout this privacy policy there will be the use of "I" or "me",
      meaning <b>echolotl</b>, the owner and operator of echolotl.lol. This
      policy explains what information I collect, why I use it, and what you can
      do about it. I try to collect only what is needed to run and improve the
      site, and to satiate my curiosity and enjoyment of statistics. This policy
      applies to echolotl.lol and its related services, and I'll try to be as
      transparent as possible.
    </p>
    <br />
    <p style="color: var(--text-secondary)">
      No personal data is collected or sold in accordance with the CCPA
      (California Consumer Privacy Act) or similar privacy laws.
    </p>
    <br />
    <p style="color: var(--text-secondary)">
      If you have the technical expertise and wish to verify how exactly your
      data is handled, you can review the
      <a
        href="https://github.com/echolotl/echolotl.lol"
        class="link"
        target="_blank"
        rel="noopener noreferrer"
        >source code and documentation of the site</a
      >.
    </p>

    <h2>Information I collect</h2>
    <h3>When you visit the site</h3>
    <p>
      I use self-hosted
      <a
        href="https://umami.is"
        class="link"
        target="_blank"
        rel="noopener noreferrer"
        >Umami</a
      >
      analytics to see what pages are being visited, and from where. These
      analytics may include the page address, referrer, browser and device
      details, and an approximate location derived from network information and
      what it was accessed from, but these can be easily circumnavigated with
      tools such as VPN. You can read about how Umami stores its data in their
      documentation, but it basically creates a anonymous and rotating session
      token that may identify you across browsing sessions, but isn't linked
      directly to anything. The hosting and network providers (currently, I use
      <a
        href="https://railway.app"
        class="link"
        target="_blank"
        rel="noopener noreferrer"
        >Railway</a
      >) may also process or log IP addresses and request information to operate
      their services. You may wish to review their privacy policies for more
      information.
    </p>
    <br />
    <p>
      Analytics have been stored since September 23rd, 2026, and will continue
      to be retained for the foreseeable future.
    </p>

    <h3>When you sign in with Discord</h3>
    <p>
      Sign-in is only handled by
      <a
        href="https://discord.com"
        class="link"
        target="_blank"
        rel="noopener noreferrer"
        >Discord</a
      >
      using its OAuth service.
      <span style="color: var(--orange)"
        >I do not receive your Discord password.</span
      >
      With your authorization, I receive and store your Discord account ID,
      username, display name, and avatar hash (not the actual image). I also
      store a site account ID, your profile and account preferences, and the
      OAuth tokens needed to keep your session working and refresh your profile.
      OAuth tokens are encrypted in the backend database.
    </p>
    <br />
    <p>
      The site uses an session cookie to keep you signed in. The cookie is sent
      to the site, is not readable by page scripts, and expires after 30 days. A
      short-lived cookie is also used during Discord sign-in to protect the
      sign-in flow, which is pretty normal practice for those OAuth services.
    </p>

    <h3>Comments and other content</h3>
    <p>
      If you post or reply to a comment, I store its text, the content it
      belongs to, its author account ID, and its creation and edit times.
      Comments are public, even if you choose to make your profile anonymous!
      Choosing anonymous mode hides your Discord profile from other visitors,
      but I still retain the your actual account details, which you can see even
      if you have chosen anonymous mode. I would hope it's common sense, but
      please do not post private information on some random person's personal
      website, and see the
      <NuxtLink to="/tos" class="link">Terms of Service</NuxtLink>
      for more details.
    </p>
    <br />
    <p>
      Deleting a comment replaces its text with “[deleted]” on the site so
      replies remain in context, but the original text is not currently erased
      from the database (for auditing or recovery purposes). New comments,
      replies, and edits may also be sent to a private Discord channel I control
      for notifications. Discord may retain those copies independently of this
      site, I don't know.
    </p>

    <h3>Information saved in your browser</h3>
    <p>
      The site saves your theme preference, Picross daily game progress and
      statistics, and
      <span style="color: var(--text-secondary)"
        >(if you have chosen to remember it)</span
      >
      your age-confirmation preference in your browser's local storage. This
      information stays on your device and is not sent to my backend by these
      features. Refer to your browser's documentation for how to clear local
      storage. Clearing it may reset these preferences or erase saved game
      progress.
    </p>

    <h2>How I use information</h2>
    <ul>
      <li>To provide sign-in, keep sessions working, and display profiles.</li>
      <li>To publish, edit, delete, and display comments and replies.</li>
      <li>To protect, troubleshoot, and maintain the site and its services.</li>
      <li>To understand general site traffic and improve the site.</li>
      <li>To send notifications about account and comment activity.</li>
      <li>To comply with legal obligations and respond to privacy requests.</li>
    </ul>
    <p>
      I do not sell personal information or use it for advertising. I do not use
      it to make decisions about you in ways that have legal or similarly
      significant effects.
    </p>

    <h2>Who receives information</h2>
    <p>
      I use service providers to operate the site. The frontend, backend, and
      self-hosted analytics are hosted on Railway, as mentioned previously.
      These providers may process information such as network requests and logs
      as needed to provide their services. Discord receives information when you
      sign in, when the site requests your authorized profile, and when comment
      or account notifications are sent to my private Discord channel. Your
      browser also contacts Discord's image content delivery network when it
      loads a Discord avatar. Those providers handle information under their own
      privacy policies.
    </p>
    <br />
    <p>
      I do not disclose information to other parties except as described here,
      when you make it public by posting content, when necessary to operate or
      protect the service, or when required by law.
      <span style="color: var(--orange)"
        >I do not control copies made by other people or by third-party
        services.</span
      >
    </p>

    <h2>How long I keep information</h2>
    <ul>
      <li>
        Account information and tokens are kept while your account is active. If
        you delete your account, it is immediately removed from the database.
      </li>
      <li>
        Comments are kept until deleted by you. A deleted comment's text is
        hidden on the site but, as noted above, remains in the database.
        Comments remain associated with the site account ID if you delete your
        account, but your Discord info is removed.
      </li>
      <li>
        Copies of notifications sent to Discord are subject to Discord's
        retention and deletion, which I do not control. You should read their
        privacy policy for that information.
      </li>
      <li>
        Session cookies expire after 30 days, and analytics data is retained
        until I manually delete it.
      </li>
    </ul>
    <p>
      If you want a comment removed from the database or have another deletion
      request, contact me at
      <a href="mailto:echolotl@echolotl.lol" class="link"
        >echolotl@echolotl.lol</a
      >. I will review the request and make reasonable efforts to fulfill it.
    </p>

    <h2>Security and changes</h2>
    <p>
      While I try to use reasonable safeguards for the information I maintain,
      there's a reason why I only collect primarily useless data if something
      were to happen.
    </p>
    <br />
    <p>
      I may update this policy as the site or its practices change. I will
      update the date at the top when I do, and you, as a user of the site, are
      responsible for reviewing the policy periodically. I cannot send notice,
      as I do not maintain direct contact information for all users.
    </p>
  </div>
</template>

<style scoped>
.privacy-policy {
  width: 100%;
  max-width: 50em;
  margin: 0 auto;
  min-height: 100vh;
  padding: 0 1rem;
  margin-top: 64px;

  h1 {
    font-size: 2rem;
    margin-bottom: 0.75rem;
  }
}
</style>
