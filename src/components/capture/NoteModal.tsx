import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Check } from 'lucide-react';
import { haptics } from '../../utils/haptics';

export interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveNote: (data: {
    title: string;
    content: string;
    category: string;
    tags: string[];
  }) => void;
}

export const NoteModal: React.FC<NoteModalProps> = ({
  isOpen,
  onClose,
  onSaveNote,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Catatan');

  const handleSave = () => {
    if (!title.trim() && !content.trim()) return;
    haptics.notificationSuccess();
    onSaveNote({
      title: title.trim() || 'Catatan Baru',
      content: content.trim(),
      category: category.trim() || 'Catatan',
      tags: ['Catatan', category.trim()],
    });
    setTitle('');
    setContent('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tulis Catatan"
      description="Simpan pemikiran, ide, atau kutipan penting"
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant="primary"
            leftIcon={<Check className="w-4 h-4 stroke-[2.5]" />}
            onClick={handleSave}
            disabled={!title.trim() && !content.trim()}
          >
            Simpan Catatan
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Judul Catatan"
          placeholder="Misal: Ide aplikasi atau Daftar belanja..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1.5">
            Isi Catatan
          </label>
          <textarea
            rows={5}
            placeholder="Tulis apa saja di sini..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full text-sm p-3.5 rounded-2xl border border-stone-200/90 focus:border-[#165a4c] focus:ring-2 focus:ring-emerald-800/10 placeholder:text-stone-400 leading-relaxed bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1.5">
            Kategori
          </label>
          <div className="flex flex-wrap gap-1.5">
            {['Catatan', 'Ide', 'Pekerjaan', 'Pribadi', 'Keuangan'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  haptics.impactLight();
                  setCategory(cat);
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  category === cat
                    ? 'bg-[#165a4c] text-white shadow-2xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
