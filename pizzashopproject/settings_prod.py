DEBUG = False
ALLOWED_HOSTS = ['*']


DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycorp2',
        'NAME': 'dbPizza',
        'USER': 'django-shop',
        'PASSWORD': 'A123abc123',
        'HOST': 'localhost',
        'PORT': '',
            }
}
