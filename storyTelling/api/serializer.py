from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Story, Instruction


class StorySerializer(serializers.ModelSerializer):
    author = serializers.SlugRelatedField(slug_field="username", read_only=True)

    class Meta:
        model = Story
        fields = "__all__"


class InstructionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Instruction
        fields = "__all__"
