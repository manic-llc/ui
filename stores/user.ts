import { type ShallowRef } from 'vue';
import { acceptHMRUpdate, defineStore } from 'pinia';
import * as UserAPI from '../api/user';
import * as AuthAPI from '../api/auth';
import { pause } from '../util/time';

const USER_ID_KEY: string = 'SHADERPAD.uid';

export const useUser = defineStore('user', () => {
  const user: Ref<any> = ref(null);
  const ui = useUI();
  const userId: Ref<any> = ref(null);
  const sketches: ShallowRef<any> = ref([]);
  const loading: Ref<boolean> = ref(true);
  const authenticated: ComputedRef<boolean> = computed(() => !loading.value && !!user.value);
  const admin: ComputedRef<boolean> = computed(() => {
    return !!authenticated.value && user.value?.admin === true;
  });
  const dateRange: ComputedRef<any[]> = computed(() => {
    const range = sketches.value.map(s => new Date(s.created).valueOf()).sort();
    return [new Date(range[0]), new Date(range[range.length - 1])];
  });

  function getUser(id: string): Promise<any> {
    return UserAPI.getUser(id);
  }

  function getUsers(): Promise<any> {
    return UserAPI.getUsers();
  }

  async function createUser(data: any): Promise<any> {
    try {
      user.value = await UserAPI.createUser(data);
    } catch (e) {
      console.log(e);
    }
  }

  function updateUser(id: string, data: any): Promise<any> {
    return UserAPI.updateUser(id, data);
  }

  function deleteUser(id: string): Promise<any> {
    return UserAPI.deleteUser(id);
  }

  function massageSketches(sketches: any[]) {
    return sketches
      .map(v => {
        v.created = new Date(v.created);
        return v;
      })
      .sort((a, b) => (a.created.valueOf() < b.created.valueOf() ? 1 : -1));
  }

  async function login(data: any): Promise<any> {
    try {
      const session = await AuthAPI.login(data);
      if (session.user) {
        localStorage.setItem(USER_ID_KEY, JSON.stringify({ user: session.user }));
        const data = await getUser(session.user);
        sketches.value = massageSketches(data.sketches);
        data.sketches = null;
        user.value = data;
        userId.value = data._id;
      }
    } catch (e) {
      console.log(e);
    }
  }

  async function getSession(): Promise<any> {
    let key: any = localStorage.getItem(USER_ID_KEY);

    try {
      key = JSON.parse(key).user;

      if (key) {
        UserAPI.api.setToken(key);
        AuthAPI.api.setToken(key);
        const [data] = await Promise.all([getUser(key), pause(1000)]);
        sketches.value = massageSketches(data.sketches);
        data.sketches = null;
        user.value = data;
        userId.value = key;
      } else {
        localStorage.setItem(USER_ID_KEY, JSON.stringify(null));
      }

      loading.value = false;
      ui.loaded = true;
    } catch (e) {
      localStorage.setItem(USER_ID_KEY, JSON.stringify(null));
      loading.value = false;
      ui.loaded = true;
    }
  }

  getSession();

  return {
    user,
    userId,
    getUser,
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    login,
    getSession,
    authenticated,
    admin,
    sketches,
    dateRange,
    loading,
    $reset() {},
  };
});

// if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useUser, import.meta.hot));
