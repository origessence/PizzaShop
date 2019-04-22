from django.http import JsonResponse

from .models import PizzaShop , Pizza
from pizzashopapp.serializers import PizzaShopSerializer # , PizzaSerializer

def client_pizzashops_js(request):
    pizzashops = PizzaShopSerializer(
        PizzaShop.objects.all().order_by('-id'),
        many = True,
        context={'request':request}
    ).data


    return JsonResponse({'pizzashops':pizzashops})

def client_pizzas(request):
    return JsonResponse({})


#def client_pizza(request, pizzashop_id):
#    pizzas = PizzaSerializer(
#       Pizza.objects.all().filter(pizzashop_id=pizzashop_id).order_by('-id'),
#        many = True,
#        context={'request':request}
#    ).data
#
#
#    return JsonResponse({'pizzashops':pizzashops})
