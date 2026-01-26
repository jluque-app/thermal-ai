from torchvision import transforms
import torchvision
import torch
import numpy as np
import cv2
import os
import gdown
from PIL import Image

transforms_image = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])
def run_prediction(model, device, image_list, name_list, result_path, is_save_result=False):
    input_size = len(image_list)

    for i in range(input_size):
        img = image_list[i]
        filename = name_without_extension(name_list[i])

        # predict prediction, annotated image, and estimated Window-to-Wall Ratio
        pred_img, anno_image, wwr = predict(model, img, device)
        displayPrediction(filename, img, pred_img, anno_image, wwr)

        # save prediction if is_save_result is true
        if (is_save_result):
            save_result(pred_img, anno_image, wwr, result_path, filename)
    return
    
def process_upload_files(uploaded_files, max_height=500, max_width=500):
    image_list = []
    name_list = []

    # process uploaded images
    for up_file in uploaded_files:
        filename = up_file.name
        name_list.append(filename)

        img = np.array(Image.open(up_file).convert('RGB'))
        img = resize_image(img, max_height, max_width)
        image_list.append(img)
    return image_list, name_list
    
def displayPrediction(filename, _img, _pred, _anno, _wwr):

    # Display in 3 columns.
    # col0: original image,
    # col1: prediction (colormap),
    # col0: prediction (annotation),

    cols = st.columns(3)
    cols[0].image(_img, use_column_width=True, caption='Image: {}'.format(filename))
    cols[1].image(_pred, use_column_width=True, caption='Segmentation')
    cols[2].image(_anno, use_column_width=True, caption='Annotation')

    # Markdown
    st.markdown("> Estimated Window-to-Wall Ratio:  **{}**".format(_wwr))
    # st.markdown("> Estimated Window-to-Wall Ratio:  " + "**" + wwr_percentage + "**")
    st.markdown("------")
    return    
def resize_image(image, max_height, max_width):
    image = np.array(image)
    height, width, _ = image.shape

    scale_height = max_height / height
    scale_width = max_width / width
    scale = min(scale_height, scale_width, 1)
    image = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    return image

# def deeplabv3ModelGenerator(model_path, device):
#     num_classes = 9
#     model = init_deeplab(num_classes)
#     state_dict = torch.load(model_path, map_location=device)
#     model = model.to(device)
#     model.load_state_dict(state_dict)
#     return model

# One image at a time.
def predict(model, image, device, obj):
    # make sure image is a np-array
    # image = resize_image(image)
    prediction_indexed = label_image(model, image, device)
    prediction = decode_segmap(prediction_indexed,obj)
    annotation = annotate_image(image, prediction_indexed)
    wwr_estimation = get_wwr_by_pixel(prediction_indexed)
    wwr_percentage = str(round(wwr_estimation * 100, 2)) + "%"
    window_count,wall_count,door_count = counters(prediction_indexed)
    
    wwr_estimation2 = get_wwr_by_pixel2(prediction_indexed)
    wwr_percentage2 = str(round(wwr_estimation2 * 100, 2)) + "%"

    
    return prediction, annotation,wwr_percentage,wwr_percentage2,window_count,wall_count,door_count

def save_result(pred, anno, wwr, path, filename):
    create_folder(path)
    save_image(pred, path, 'segmentation', filename)
    save_image(anno, path, 'annotation', filename)
    save_wwr(wwr, path, filename)
    return

def save_image(_img, path, foldername, filename):
    folder_path = "{}/{}".format(path, foldername)
    create_folder(folder_path)
    full_path = "{}/{}.jpg".format(folder_path, filename)
    # CV2 write
    bgr_img = cv2.cvtColor(_img, cv2.COLOR_RGB2BGR)
    cv2.imwrite(full_path, bgr_img)
    return

def save_wwr(wwr, path, filename, mode='a'):
    # append mdoe (if the file doesn't exist create it and open in append mode)
    wwr_result_filename = "wwr_estimation.csv"
    full_path = "{}/{}".format(path, wwr_result_filename)
    print(full_path)
    f = open(full_path, mode)
    f.write("{},{}\n".format(filename, wwr))
def counters(prediction_indexed):
    window_count = np.sum(prediction_indexed == 8)
    wall_count = np.sum(prediction_indexed == 1)
    door_count = np.sum(prediction_indexed == 3)
    return window_count,wall_count,door_count
    
def get_wwr_by_pixel(prediction_indexed):
    # 0 Void, or various
    # 1 Wall
    # 2 Car
    # 3 Door
    # 4 Pavement
    # 5 Road
    # 6 Sky
    # 7 Vegetation
    # 8 Windows
    window_count = np.sum(prediction_indexed == 8)
    wall_count = np.sum(prediction_indexed == 1)
    door_count = np.sum(prediction_indexed == 3)

    return window_count / (window_count + wall_count + door_count)
def get_wwr_by_pixel2(prediction_indexed):
    # 0 Void, or various
    # 1 Wall
    # 2 Car
    # 3 Door
    # 4 Pavement
    # 5 Road
    # 6 Sky
    # 7 Vegetation
    # 8 Windows
    window_count = np.sum(prediction_indexed == 8)
    wall_count = np.sum(prediction_indexed == 1)
    door_count = np.sum(prediction_indexed == 3)

    return wall_count / (window_count + wall_count + door_count)

def annotate_image(image, pred_indexed):
    annotate_colors = {
        0: (0, 0, 0),           # Various
        1: (128, 0, 0),         # Wall
        2: (128, 0, 128),       # Car
        3: (128, 128, 0),       # Door
        4: (128, 128, 128),     # Pavement
        5: (128, 64, 0),        # Road
        6: (0, 128, 128),       # Sky
        7: (0, 128, 0),         # Vegetation
        8: (0, 0, 128)          # Windows
    }
    image = np.array(image)

    dim_factor = 0.5
    image = image * dim_factor

    r = image[:, :, 0]
    g = image[:, :, 1]
    b = image[:, :, 2]

    anno_factor = 0.5

    for label in annotate_colors:
        idx = pred_indexed == label
        r[idx] += annotate_colors[label][0] * anno_factor
        g[idx] += annotate_colors[label][1] * anno_factor
        b[idx] += annotate_colors[label][2] * anno_factor

    rgb = np.stack([r, g, b], axis=2)
    rgb = rgb.clip(0, 255)
    image = rgb.astype('uint8')
    return image


# Define the helper function
def decode_segmap(pred_indexed, obj, nc=9):
    if obj == 'window':
       label_colors = {
        0: (0, 0, 0),           # Various
        1: (0, 0, 0),         # Wall
        2: (0, 0, 0),       # Car
        3: (0, 0, 0),       # Door
        4: (0, 0, 0),     # Pavement
        5: (0, 0, 0),        # Road
        6: (0, 0, 0),       # Sky
        7: (0, 0, 0),         # Vegetation
        8: (255, 255, 0)          # Windows
        }
    elif obj == 'wall':
       label_colors = {
        0: (0, 0, 0),           # Various
        1: (255, 255, 0),         # Wall
        2: (0, 0, 0),       # Car
        3: (0, 0, 0),       # Door
        4: (0, 0, 0),     # Pavement
        5: (0, 0, 0),        # Road
        6: (0, 0, 0),       # Sky
        7: (0, 0, 0),         # Vegetation
        8: (0, 0, 0)          # Windows
        }        
    else :
       label_colors = {
        0: (0, 0, 0),           # Various
        1: (128, 0, 0),         # Wall
        2: (128, 0, 128),       # Car
        3: (128, 128, 0),       # Door
        4: (128, 128, 128),     # Pavement
        5: (128, 64, 0),        # Road
        6: (0, 128, 128),       # Sky
        7: (0, 128, 0),         # Vegetation
        8: (0, 0, 128)          # Windows
        }
    r = np.zeros_like(pred_indexed).astype(np.uint8)
    g = np.zeros_like(pred_indexed).astype(np.uint8)
    b = np.zeros_like(pred_indexed).astype(np.uint8)

    for label in range(0, nc):
        idx = pred_indexed == label
        r[idx] = label_colors[label][0]
        g[idx] = label_colors[label][1]
        b[idx] = label_colors[label][2]

    rgb = np.stack([r, g, b], axis=2)

    return rgb


def label_image(model, image, device):
    image = transforms_image(image)
    image = image.unsqueeze(0)
    image = image.to(device)
    outputs = model(image)["out"]
    _, preds = torch.max(outputs, 1)

    preds = preds.to("cpu")
    preds_np = preds.squeeze(0).cpu().numpy().astype(np.uint8)

    return preds_np

def init_deeplab(num_classes):
    model_deeplabv3 = torchvision.models.segmentation.deeplabv3_resnet101()
    model_deeplabv3.aux_classifier = None
    model_deeplabv3.classifier = torchvision.models.segmentation.deeplabv3.DeepLabHead(2048, num_classes)

    return model_deeplabv3

def create_folder(folder_path):
    if not os.path.exists(folder_path):
        os.mkdir(folder_path)
    return

# def clear_folder(folder_path):
#     # Check if the image uploading folder exist
#     # If yes, delete all file under this path
#     if os.path.exists(folder_path):
#         for img_name in os.listdir(folder_path):
#             filepath = os.path.join(folder_path, img_name)
#             print(filepath)
#             os.remove(filepath)
#     # if the folder doesn't exist, create an empty folder.
#     else:
#         os.mkdir(folder_path)
#     return
