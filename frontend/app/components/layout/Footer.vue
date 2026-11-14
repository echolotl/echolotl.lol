<template>
  <footer>
    <div class="footer-content">
      <div class="content-container">
        <div class="small-username"></div>
        <SocialIcons style="image-rendering: pixelated" />
        <div>© 2026 echolotl</div>
        <div v-if="user" class="user-info">
          <UserAvatar :user="user" />
          <div class="user-details">
            <div>
              Logged in as
              <span class="lotl-font">{{ getDisplayName(user) }}</span>
            </div>
            <div class="actions">
              <nuxt-link to="/account" class="link">Manage</nuxt-link>•
              <button type="button" class="link footer-action" @click="logout">
                Logout
              </button>
            </div>
          </div>
        </div>
        <div v-else class="user-info logged-out">
          Not logged in.
          <button type="button" class="link footer-action" @click="login">
            Login
          </button>
        </div>
        <div class="license">
          <div class="license-image">
            <Icon icon="creative-commons" />
            <Icon icon="profile" color="var(--text-secondary)" />
            <Icon icon="no-monetization" />
            <Icon icon="share-alike" />
          </div>
          <div class="license-text">
            Unless otherwise noted, all content on this site is licensed under
            the
            <a
              href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
              target="_blank"
              class="link"
              rel="noopener noreferrer"
              >CC BY-NC-SA 4.0 International License</a
            >.
            <br />
            Source code is licensed under the
            <a
              href="https://github.com/echolotl/echolotl.lol/blob/master/frontend/LICENSE"
              target="_blank"
              class="link"
              rel="noopener noreferrer"
              >MIT License</a
            >.
          </div>
        </div>
      </div>
    </div>
    <div class="footer-images">
      <div class="footer-image left-triangle" />
      <div class="footer-image right-triangle" />
      <div class="footer-image left-image" />
      <div class="footer-image right-image" />
    </div>
    <div v-if="rtc.public.underConstruction" class="under-construction-banner">
      <img
        class="under-construction-text"
        src="/images/underconstructiontxt.png"
        alt="Under Construction"
      />
    </div>
  </footer>
</template>

<script setup lang="ts">
import Icon from "~/components/ui/Icon.vue";
import { useAuth } from "~/composables/useAuth";
import SocialIcons from "./SocialIcons.vue";
import UserAvatar from "~/components/user/UserAvatar.vue";

const rtc = useRuntimeConfig();
const { logout, login, user, getDisplayName } = useAuth();
</script>

<style scoped lang="scss">
@use "~/assets/styles/util" as *;

footer {
  position: relative;
  display: flex;
  justify-content: flex-end;
  flex-direction: column;
  width: 100%;
  height: 500px;
  overflow: hidden;
}
.footer-images {
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  .footer-image {
    position: absolute;
    bottom: 0;
    height: 100%;
    width: 100%;
    background-color: var(--text);
    mask-repeat: no-repeat;
    mask-size: contain;
    &.left-triangle {
      left: 0;
      mask-image: url("/images/footer/footerTriangle.webp");
      mask-position: left;
      background-color: var(--background);
    }
    &.right-triangle {
      right: 0;
      mask-image: url("/images/footer/footerTriangle.webp");
      mask-position: left;
      background-color: var(--background);
      transform: scaleX(-1);
    }
    &.left-image {
      left: 0;
      mask-image: url("/images/footer/footerLeft.webp");
      mask-position: left;
    }
    &.right-image {
      right: 0;
      mask-image: url("/images/footer/footerRight.webp");
      mask-position: right;
    }
  }

  @media (max-width: 1177px) {
    .footer-image {
      &.left-image,
      &.right-image,
      &.left-triangle,
      &.right-triangle {
        display: none;
      }
    }
  }
}

.footer-content {
  position: relative;
  bottom: 0;
  background: linear-gradient(to top, var(--surface), transparent 100%);
  height: 50%;
  width: 100%;
  padding-bottom: 1.5rem;

  .content-container {
    height: 100%;
    max-width: 1200px;
    margin: 0 auto;

    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-direction: column;
    gap: 0.25rem;
    @include color-text-stroke(var(--background));

    .small-username {
      width: 100%;
      height: 35px;
      mask-image: url("/images/footer/eac.webp");
      mask-size: contain;
      mask-repeat: no-repeat;
      mask-position: center;
      background-color: var(--text);
      transform: translateX(3px);
    }
    .license-image {
      width: 100px;
      height: 30px;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-right: 0.5rem;
    }
    .license-text {
      font-size: var(--small-text);
      color: var(--text-secondary);
    }
    .license {
      margin-top: 0.25rem;
      display: flex;
      align-items: center;
      flex-direction: row;
    }
    @media (max-width: 768px) {
      padding: 0 1rem;
      .license {
        flex-direction: column;
        align-items: center;
        text-align: center;
        .license-image {
          display: none;
        }
      }
    }
  }
}

.under-construction-banner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background-image: url("/images/underconstruction.png");
  background-position: bottom;
  background-size: contain;
  background-repeat: repeat-x;
  width: 100%;
  height: 24px;
  z-index: 10;
}
.under-construction-text {
  height: 16px;
  filter: drop-shadow(2px 0 0 black) drop-shadow(-2px 0 0 black)
    drop-shadow(0 -2px 0 black) drop-shadow(0 2px 0 black);
}
.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-top: 0.5rem;
  flex-direction: row;
  .user-details {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;

    .actions {
      font-size: var(--very-small-text);
      display: flex;
      gap: 0.25rem;
    }
  }
  &.logged-out {
    justify-content: center;
    text-align: center;
    font-size: var(--small-text);
    color: var(--text-secondary);
  }
}

.footer-action {
  padding: 0;
  border: 0;
  background: transparent;
  font: inherit;
}
</style>
