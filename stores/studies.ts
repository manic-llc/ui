// import { acceptHMRUpdate, defineStore } from 'pinia';
// import { ref } from 'vue';
// import { get } from '../util/api';

// type Study = {
//   id: string;
//   iterations: any[];
// };

// export const useStudies = defineStore('studies', () => {
//   const studies: Ref<Study[]> = ref([]);

//   async function fetch() {
//     const { data }: any = await get('studies/66d111e66704570006838e59');
//     studies.value = data;
//   }

//   return {
//     studies,
//     fetch,
//   };
// });

// if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useStudies, import.meta.hot));
