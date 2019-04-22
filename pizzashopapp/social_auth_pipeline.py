

from pizzashopapp.models import Client


#клиент через facebook
def create_client(backend, user, response, *args, **kwargs):
    if backend.name == 'facebook':
        avatar = 'https://graph.facebook.com/%5/picture?type=large' % response ['id']


    #если нет то создаем клиента
    if not Client.objects.filter(user_id=user.id):
        Client.objects.create(user_id=user.id , avatar = avatar)


    
