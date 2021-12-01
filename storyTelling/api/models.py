from django.db import models
from django.contrib.auth.models import User
import random

from django_quill.fields import QuillField

from slugify import slugify


class Story(models.Model):
    title = models.CharField(max_length=150, blank=False)
    headline = models.CharField(max_length=250, blank=False)
    slug = models.CharField(max_length=50, blank=True, null=True, unique=True)
    content = models.TextField(blank=False, null=False)
    rich_content = models.TextField(blank=True, null=True)
    image_url = models.URLField()
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="story")
    likes = models.IntegerField(default=0)
    views = models.IntegerField(default=0)
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.CheckConstraint(
            name="%(app_label)s_%(class)s_values_are_greater_than_0",
            check=models.Q(likes__gte=0)
        )]

    def save(self, *args, **kwargs):
        self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title}"


def get_random_number():
    alphabet = "0123456789abcdef"
    slug = []
    for i in range(12):
        slug.append(random.choice(alphabet))
    return "".join(slug)


class Instruction(models.Model):
    text = models.CharField(max_length=250, blank=False)
    up_votes = models.IntegerField(default=0)
    down_votes = models.IntegerField(default=0)
    slug = models.CharField(max_length=12, default=get_random_number)
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-up_votes", "-created_at"]

    def __str__(self):
        return f"{self.slug}"


# Beta
class StoryMetric(models.Model):
    story_id = models.OneToOneField(Story, on_delete=models.CASCADE)
    retention = models.IntegerField(default=1)  # Retention in s
    visits = models.IntegerField(default=0)


class GlobalMetric(models.Model):
    homepage_visits = models.IntegerField(default=0)
