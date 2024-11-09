// import { acceptHMRUpdate, defineStore } from 'pinia';
// import { ref } from 'vue';
// import { v4 } from 'uuid';
// import * as ls from '../util/storage';

// type Study = {
//   id: string;
//   iterations: any[];
// };

// export const useStudies = defineStore('studies', () => {
//   const studies: Ref<Study[]> = ref([]);
//   const processed: Ref<number[]> = ref([]);
//   const archived: Ref<number[]> = ref([]);

//   function hydrate() {
//     studies.value = ls.get('studies') || [];
//     processed.value = ls.get('processed') || [];
//     archived.value = ls.get('archived') || [];
//   }

//   function persist() {
//     ls.set('studies', studies.value);
//     ls.set('processed', processed.value);
//     ls.set('archived', archived.value);
//   }

//   function createStudy(sketch: any) {
//     const uuid = v4();
//     const study = {
//       id: uuid,
//       iterations: [sketch.id],
//     };

//     studies.value.push(study);
//     processed.value.push(sketch.id);
//     persist();
//   }

//   function addIteration(studyId: string, iteration: any) {
//     const study = studies.value.find(v => v.id === studyId);
//     study?.iterations.push(iteration.id);
//     processed.value.push(iteration.id);
//     persist();
//   }

//   function archive(sketch: any) {
//     archived.value.push(sketch.id);
//     processed.value.push(sketch.id);
//     persist();
//   }

//   hydrate();

//   return {
//     createStudy,
//     studies,
//     processed,
//     addIteration,
//     archive,
//   };
// });

// if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useStudies, import.meta.hot));
