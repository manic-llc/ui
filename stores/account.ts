import { ref, type Ref, computed } from 'vue';
import { acceptHMRUpdate, defineStore } from 'pinia';
import { post } from '../util/api';
import { createdNamespacedStorageHelpers } from '../util/storage';
import { useToast } from './toast';
import { navigate } from 'vike/client/router';

const ls = createdNamespacedStorageHelpers('5HT.ACCOUNT');

export const useAccount = defineStore('account', () => {
  const toast = useToast();
  const profile: Ref<null | any> = ref(ls.get('user'));
  const authenticated: Ref<null | any> = computed(() => profile.value !== null);
  const userId = computed(() => profile.value?._id || null);
  const subscriber = computed(() => true);

  async function signup({ email, password }: any) {
    const { success, data } = await post('auth/email-signup', { email, password });

    if (success) {
      profile.value = data;
      ls.set('user', profile.value);
      toast.message('Account created successfully.');
      navigate('/studies');
      return;
    }

    toast.message(data);
  }

  async function login({ email, password }: any) {
    const { success, data } = await post('auth/email-login', { email, password });

    if (success) {
      authenticated.value = true;
      profile.value = data;
      ls.set('user', profile.value);
      toast.message('Log in successful.');
      navigate('/studies');
      return;
    }

    toast.message(data);
  }

  return {
    authenticated,
    profile,
    signup,
    login,
    userId,
    subscriber,
  };
});

// if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useAccount, import.meta.hot));
