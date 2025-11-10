import api from './api'

export const studyNotesApi = {
  create: (studyNoteData) => {
    return api.post('/study_notes', { study_note: studyNoteData })
  }
}

export default studyNotesApi

