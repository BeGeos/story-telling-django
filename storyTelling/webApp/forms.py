# forms.py
from django import forms
from django_quill.forms import QuillFormField


class RichFormField(forms.Form):
    content = QuillFormField()


class UpdateRichFormField(forms.Form):
    update_content = QuillFormField()
