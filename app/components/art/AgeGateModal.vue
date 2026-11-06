<template>
  <Modal
    v-model="open"
    max-width="440px"
    aria-label="Age verification"
    icon="warning"
    icon-color="var(--orange)"
    :close-button="false"
    @close="emit('deny')"
  >
    <div class="age-gate">
      <h2 class="age-gate__title lotl-font">Hang on...</h2>
      <p class="age-gate__text">
        This content is NSFW and intended for adults only. Are you 18 or older
        <i class="text-secondary"
          >(or equivalent in whatever region you are in)</i
        >?
      </p>
      <label class="age-gate__remember">
        <input v-model="dontAskAgain" type="checkbox" />
        Don't ask again
      </label>
      <div class="age-gate__actions">
        <button class="filled orange" @click="onYes"><b>Yes</b></button>
        <button class="round" @click="onNo">No</button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import Modal from "~/components/ui/Modal.vue";
import { useAgeVerification } from "../../composables/useAgeVerification.js";
import Icon from "~/components/ui/Icon.vue";

const open = defineModel<boolean>({ required: true });

const emit = defineEmits<{
  (e: "confirm"): void;
  (e: "deny"): void;
}>();

const { confirm } = useAgeVerification();
const dontAskAgain = ref(false);

function onYes() {
  confirm(dontAskAgain.value);
  open.value = false;
  emit("confirm");
}

function onNo() {
  open.value = false;
  emit("deny");
}
</script>

<style scoped lang="scss">
.age-gate {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__title {
    margin: 0;
  }

  &__text {
    margin: 0;
  }

  &__remember {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    user-select: none;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
  }
}
</style>
