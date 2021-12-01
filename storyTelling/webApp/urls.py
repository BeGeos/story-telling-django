from django.urls import path, re_path
from . import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("", views.home, name="homepage"),
    path("story/<str:slug>", views.story, name="story"),
    path("write-a-story/", views.write_a_story, name="write-a-story"),
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    re_path(r"^.*/$", views.not_found, name="Not-Found-web")
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
