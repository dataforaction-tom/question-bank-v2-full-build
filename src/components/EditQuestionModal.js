import React from 'react';
import { Formik, Form } from 'formik';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Autocomplete, Typography } from '@mui/material';
import * as Yup from 'yup';
import Button from './Button';

const EditQuestionSchema = Yup.object().shape({
  content: Yup.string().required('Question content is required'),
  answer: Yup.string().required('Answer is required'),
  who: Yup.string().required('Who is this question from?'),
  who_details: Yup.string().when('who', {
    is: (who) => who === 'Organisation' || who === 'Group',
    then: () => Yup.string().required('Please provide organization/group details'),
    otherwise: () => Yup.string().notRequired(),
  }),
  role_type: Yup.string().required('What is your role?'),
  user_category: Yup.string().notRequired(),
});

const EditQuestionModal = ({ isOpen, onClose, onSubmit, question }) => {
  const initialValues = {
    content: question?.content || '',
    answer: question?.answer || '',
    who: question?.who || '',
    who_details: question?.who_details || '',
    role_type: question?.role_type || '',
    user_category: question?.user_category || '',
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
            <div className="bg-gradient-to-r from-slate-950 to-sky-900 font-bold text-lg text-white pl-4 p-1 flex justify-center items-center mb-4 rounded">
        <Typography variant="h5" component="h1">
            Edit Question
        </Typography>
        </div>
      <Formik
        initialValues={initialValues}
        validationSchema={EditQuestionSchema}
        onSubmit={async (values, { setSubmitting }) => {
          await onSubmit(values);
          setSubmitting(false);
        }}
        enableReinitialize
      >
        {({
          values,
          errors,
          touched,
          handleChange,
          handleBlur,
          setFieldValue,
        }) => (
          <Form>
            <DialogContent>
              <TextField
                label="Your Question"
                name="content"
                fullWidth
                margin="normal"
                multiline
                rows={4}
                value={values.content}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.content && Boolean(errors.content)}
                helperText={touched.content && errors.content}
              />

              <TextField
                label="Answering this question means you will be able to do what?"
                name="answer"
                fullWidth
                margin="normal"
                multiline
                rows={4}
                value={values.answer}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.answer && Boolean(errors.answer)}
                helperText={touched.answer && errors.answer}
              />

              <TextField
                select
                label="Who is asking this question?"
                name="who"
                fullWidth
                margin="normal"
                value={values.who}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.who && Boolean(errors.who)}
                helperText={touched.who && errors.who}
              >
                {['Individual', 'Organisation', 'Group', 'Other'].map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>

              {(values.who === 'Organisation' || values.who === 'Group') && (
                <TextField
                  label="Please indicate the organisation or group this question belongs to"
                  name="who_details"
                  fullWidth
                  margin="normal"
                  value={values.who_details}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.who_details && Boolean(errors.who_details)}
                  helperText={touched.who_details && errors.who_details}
                />
              )}

              <Autocomplete
                freeSolo
                options={[
                  'Research',
                  'Fundraising',
                  'Delivery',
                  'Management or Executive',
                  'Policy',
                  'Finance or Operations'
                ]}
                value={values.role_type}
                onChange={(event, newValue) => {
                  setFieldValue('role_type', newValue);
                }}
                onInputChange={(event, newInputValue) => {
                  setFieldValue('role_type', newInputValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Please fill in your role type"
                    name="role_type"
                    fullWidth
                    margin="normal"
                    error={touched.role_type && Boolean(errors.role_type)}
                    helperText={touched.role_type && errors.role_type}
                    onBlur={handleBlur}
                  />
                )}
              />

              <Autocomplete
                freeSolo
                options={[
                  'Environment',
                  'Health',
                  'Education',
                  'Social',
                  'Economy',
                  'Other'
                ]}
                value={values.user_category}
                onChange={(event, newValue) => {
                  setFieldValue('user_category', newValue);
                }}
                onInputChange={(event, newInputValue) => {
                  setFieldValue('user_category', newInputValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Add your own user defined category here if you prefer"
                    name="user_category"
                    fullWidth
                    margin="normal"
                    error={touched.user_category && Boolean(errors.user_category)}
                    helperText={touched.user_category && errors.user_category}
                    onBlur={handleBlur}
                  />
                )}
              />
            </DialogContent>
            <DialogActions>
              <Button type="Cancel" onClick={onClose}>
                Cancel
              </Button>
              <Button type="Submit">
                Save Changes
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default EditQuestionModal;
