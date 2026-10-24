---
visibility: public
category: project
name: News Classifier
status: built_and_deployed
focus: machine_learning, nlp, text_classification
---

# News Classifier — NLP and Machine Learning

**Live demo:** https://news-ai-classifier.streamlit.app/  
**GitHub:** https://github.com/aounkazmi-dev/News-classifier

## Summary

A multiclass news-text classifier that predicts a category from a headline or article description. It uses TF-IDF to transform text into numeric features and Logistic Regression to classify the text.

## Reported implementation

- Dataset: AG News, reported as 120,000 samples across World, Sports, Business, and Science/Technology
- Text features: TF-IDF vectorization
- Classifier: Logistic Regression
- Interface: Streamlit
- Saved model and vectorizer: Pickle serialization
- Reported test accuracy: approximately 91%
- Interface reportedly displays the predicted class and top-three confidence scores

## What it demonstrates

- An end-to-end classical NLP workflow
- Text preprocessing and feature extraction
- Supervised multiclass classification
- Model serialization and inference in an application
- Exposing model predictions through a deployed interface

## Important boundary

This is a classical ML/NLP project, not a deep learning or Transformer-based classifier. The approximately 91% figure is reported by the repository and has not been independently audited here.
