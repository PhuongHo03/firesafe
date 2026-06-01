import { FormEvent, useState } from "react";
import { INITIAL_CAMERA_FORM } from "@/features/cameras/states/cameraState";
import { CameraFormState } from "@/features/cameras/types/camera";

export function useCameraForm(addCamera: (form: CameraFormState) => Promise<boolean>) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_CAMERA_FORM);
  const [saving, setSaving] = useState(false);

  function updateField(field: keyof CameraFormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const success = await addCamera(form);
    if (success) {
      setForm(INITIAL_CAMERA_FORM);
      setShowForm(false);
    }
    setSaving(false);
  }

  return { showForm, setShowForm, form, saving, updateField, handleAdd };
}
