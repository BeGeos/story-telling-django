from django.urls import path, re_path
from . import views

urlpatterns = [
    path("", views.home_api, name="home-api"),
    path("write-a-story", views.write_a_story, name="write-a-story-api"),
    path("story/like/<str:slug>", views.like_story, name="like-story"),
    path("story/unlike/<str:slug>", views.unlike_story, name="unlike-story"),
    path("story/view/<str:slug>", views.add_view_story, name="add-view-story"),
    path("story/<str:slug>", views.StoryView.as_view(), name="single-story"),
    path("story", views.StoryView.as_view(), name="all-stories"),
    path("instruction/like/<str:slug>", views.like_instruction, name="like-instruction"),
    path("instruction/unlike/<str:slug>", views.unlike_instruction, name="unlike-instruction"),
    path("instruction/<str:slug>", views.InstructionView.as_view(), name="single-instruction"),
    path("instruction", views.InstructionView.as_view(), name="all-instructions"),
    re_path(r"^.*/$", views.not_found, name="Not-Found-API")
]