<template>
  <SketchFilter :id="filterId" flood-color="var(--distant)" />
  <img
    class="user-avatar"
    :src="src"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      filter: `url(#${filterId})`,
    }"
    :alt="`${displayName || 'User'} Avatar`"
  />
</template>

<script setup lang="ts">
import { computed, useId } from "vue";
import { useAuth } from "~/composables/useAuth";
import SketchFilter from "~/components/ui/SketchFilter.vue";
import { type PublicUser } from "~/composables/useAuth";

const props = withDefaults(
  defineProps<{
    size?: number;
    user?: PublicUser | null;
    ignoreAnonymous?: boolean;
    default?: boolean;
  }>(),
  {
    size: 48,
    ignoreAnonymous: false,
    default: false,
  },
);

const { getAvatarUrl, getDisplayName, user: authUser, publicUser } = useAuth();

const filterId = `user-avatar-sketch-filter-${useId()}`;
const src = computed(() => {
  if (props.default) return "/images/defaultavatar.webp";
  if (props.user) return getAvatarUrl(props.user);
  return "/images/deletedavatar.webp";
});
const displayName = computed(() => {
  if (props.user) return getDisplayName(props.user);
  if (!authUser.value) return "Deleted User";
  return props.ignoreAnonymous
    ? getDisplayName(authUser.value)
    : getDisplayName(publicUser.value!);
});
</script>

<style scoped lang="scss">
.user-avatar {
  border-radius: 50%;
  pointer-events: none;
}
</style>
