import { motion } from 'framer-motion';
import { PluginAPI } from '../../plugins/PluginAPI';
import { HiXMark } from 'react-icons/hi2';
import useTheme from '../../stores/themeStore';
import { useTranslation } from 'react-i18next';
import getThemeStyles from '../../lib/theme-utils';
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Star } from '@mui/icons-material';
import logo from '../../assets/logo.svg';

interface IfeedbackModalProps {
  pluginId: number;
  onClose: () => void;
  pluginAPI: PluginAPI;
}

interface IFeedbackFormData {
  pluginId: number;
  rating: number | null;
  comment: string;
  suggestion: string;
}

const FeedbackModel = ({ pluginId, pluginAPI, onClose }: IfeedbackModalProps) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeStyles = getThemeStyles(isDark);
  const [formData, setFormData] = useState<IFeedbackFormData>({
    comment: '',
    suggestion: '',
    rating: null,
    pluginId: pluginId,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const texts = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent',
  };

  const handleStarClick = (starIndex: number) => {
    setFormData(prv => ({
      ...prv,
      rating: starIndex,
    }));
  };

  const handleStarHover = (starIndex: number) => {
    setHoveredStar(starIndex);
  };

  const getRatingText = (rating: number) => {
    return texts[rating as keyof typeof texts] || '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData(prv => ({
      ...prv,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (formData.rating == null) {
      toast.error('Please provide some rating');
      return;
    }
    try {
      console.log(formData);

      const response = await pluginAPI.submitPluginFeedback(formData);

      if (response.status == 201) {
        toast.success(response?.data?.message || 'Feedback submitted successfully');
        onClose();
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to submit feedback: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-xl p-6 md:max-w-xl"
        style={{
          background: themeStyles.colors.bg.primary,
          border: `1px solid ${themeStyles.card.borderColor}`,
        }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold" style={{ color: themeStyles.colors.text.primary }}>
            {t('plugins.feedback.title')}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-opacity-10"
            style={{ background: themeStyles.colors.text.secondary + '20' }}
          >
            <HiXMark className="h-5 w-5" style={{ color: themeStyles.colors.text.secondary }} />
          </button>
        </div>
        {/* main content */}
        <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
          <div className="flex flex-col gap-3">
            <div>{t('plugins.feedback.rate')}</div>
            <div className="mb-2 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(star => {
                const showLogo = star <= (hoveredStar || (formData.rating as number));

                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleStarClick(star)}
                    onMouseEnter={() => handleStarHover(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className="p-1 transition-colors"
                  >
                    <div
                      className={`h-6 w-6 ${showLogo ? 'bg-contain bg-center bg-no-repeat' : ''}`}
                      style={
                        showLogo
                          ? {
                              WebkitMaskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='white' viewBox='0 0 24 24'%3E%3Cpath d='M12 .587l3.668 7.568 8.332 1.151-6.064 5.923 1.512 8.257L12 18.896l-7.448 4.59 1.512-8.257L0 9.306l8.332-1.151z'/%3E%3C/svg%3E")`,
                              WebkitMaskRepeat: 'no-repeat',
                              WebkitMaskSize: 'cover',
                              backgroundImage: `url(${logo})`,
                            }
                          : {}
                      }
                    >
                      {!showLogo && <Star className="h-6 w-6 text-gray-400 transition-colors" />}
                    </div>
                  </button>
                );
              })}
            </div>
            {formData.rating && formData.rating > 0 && (
              <p className="text-sm font-medium text-yellow-400">
                {getRatingText(formData.rating)}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <div>{t('plugins.feedback.comment.title')}</div>
            <input
              type="text"
              name="comment"
              placeholder={t('plugins.feedback.comment.placeholder')}
              value={formData.comment}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              className="w-full rounded-lg border px-4 py-3 outline-none transition-colors"
              style={{
                background: themeStyles.colors.bg.secondary,
                borderColor: themeStyles.card.borderColor,
                color: themeStyles.colors.text.primary,
              }}
            />
          </div>
          <div className="flex flex-col gap-3">
            <div>{t('plugins.feedback.suggestion.title')}</div>
            <input
              type="text"
              name="suggestion"
              placeholder={t('plugins.feedback.suggestion.placeholder')}
              value={formData.suggestion}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              className="w-full rounded-lg border px-4 py-3 outline-none transition-colors"
              style={{
                background: themeStyles.colors.bg.secondary,
                borderColor: themeStyles.card.borderColor,
                color: themeStyles.colors.text.primary,
              }}
            />
          </div>
          <div className="flex justify-end gap-4">
            <div className="flex gap-3">
              <motion.button
                onClick={onClose}
                className="flex-1 rounded-lg px-4 py-2 font-medium transition-colors"
                style={{
                  background: themeStyles.colors.text.secondary + '20',
                  color: themeStyles.colors.text.secondary,
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {t('common.cancel')}
              </motion.button>
              <motion.button
                type="submit"
                className="flex-1 rounded-lg px-4 py-2 font-medium transition-colors"
                style={{
                  background: themeStyles.button.primary.background,
                  color: 'white',
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {t(`common.submit`)}
              </motion.button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default FeedbackModel;
